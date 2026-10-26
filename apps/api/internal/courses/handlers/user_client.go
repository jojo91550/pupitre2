package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/jojo91550/pupitre2/apps/api/internal/courses/config"
	"github.com/jojo91550/pupitre2/apps/api/internal/courses/content"
	"github.com/jojo91550/pupitre2/apps/api/internal/platform/httpx"
)

// courseProgress is one learner's state in one course, as course-service
// needs it while rendering: which lessons are viewed, what each quiz module
// scored, and the aggregates used to evaluate prerequisites.
//
// It is fetched once per request from a single user-service endpoint. The
// handlers used to assemble the same information from four separate calls
// (enrollment check, viewed lessons, module progress, course summary), some
// of them issued more than once while rendering one page.
type courseProgress struct {
	Enrolled      bool
	Viewed        map[string]bool
	Modules       map[int]moduleProgressData
	TotalScore    int
	PassedModules map[string]bool
	ViewedCount   int
}

// emptyCourseProgress is what every failed lookup returns, so callers can
// treat an unreachable user-service as "no progress recorded" without
// special-casing nil maps.
func emptyCourseProgress() *courseProgress {
	return &courseProgress{
		Viewed:        map[string]bool{},
		Modules:       map[int]moduleProgressData{},
		PassedModules: map[string]bool{},
	}
}

// UserProgress is what the courses domain needs from the users domain:
// a learner's enrollments and progress, read and written. In the monolith
// it is a set of function calls into the users domain; the HTTP
// implementation below serves the standalone course-service binary until
// it is removed (docs/specs/104-backend-in-process-calls.md).
type UserProgress interface {
	// CourseOverview returns a learner's full progress in one course.
	CourseOverview(ctx context.Context, userID, courseSlug string) (ProgressOverview, error)
	// CourseSummaries returns the prerequisite aggregates of several
	// courses, keyed by course slug.
	CourseSummaries(ctx context.Context, userID string, courseSlugs []string) (map[string]CourseSummary, error)
	// EnrolledInAnyPath reports whether the learner is enrolled in one of
	// the paths.
	EnrolledInAnyPath(ctx context.Context, userID string, pathSlugs []string) (bool, error)
	// IsEnrolled reports whether the learner is enrolled in the course.
	IsEnrolled(ctx context.Context, userID, courseSlug string) (bool, error)
	// AutoEnroll enrolls the learner in a public course.
	AutoEnroll(ctx context.Context, userID, courseSlug string) error
	// MarkLessonComplete records a viewed lesson and its XP.
	MarkLessonComplete(ctx context.Context, userID, courseSlug, lessonSlug string) error
	// MarkCourseComplete records a completed course: badge, XP and skills.
	MarkCourseComplete(ctx context.Context, completion CourseCompletion) error
	// RecordModule records a quiz or lab result and its XP.
	RecordModule(ctx context.Context, result ModuleResult) error
}

// ProgressOverview is one learner's progress in one course, as
// GET /internal/progress/overview reports it.
type ProgressOverview struct {
	Enrolled      bool             `json:"enrolled"`
	Viewed        []string         `json:"viewed"`
	Modules       []ModuleProgress `json:"modules"`
	TotalScore    int              `json:"totalScore"`
	PassedModules []string         `json:"passedModules"`
	ViewedCount   int              `json:"viewedCount"`
}

// ModuleProgress is the recorded result of one module.
type ModuleProgress struct {
	ModuleIndex int  `json:"moduleIndex"`
	BestScore   int  `json:"bestScore"`
	MaxScore    int  `json:"maxScore"`
	Passed      bool `json:"passed"`
	Attempts    int  `json:"attempts"`
}

// CourseSummary is the prerequisite aggregate of one course for a learner.
type CourseSummary struct {
	TotalScore    int      `json:"totalScore"`
	PassedModules []string `json:"passedModules"`
	ViewedCount   int      `json:"viewedCount"`
}

// courseSummariesBody is the wire shape of
// GET /internal/progress/course-summaries.
type courseSummariesBody struct {
	Summaries map[string]CourseSummary `json:"summaries"`
}

// users returns the users-domain dependency: the one wired in by the
// monolith, or the user-service HTTP client of the standalone binary.
func (s *State) users() UserProgress { //nolint:ireturn // the wired users domain, or its HTTP fallback
	if s.Users != nil {
		return s.Users
	}

	return &httpUserProgress{config: s.Config}
}

// httpUserProgress implements UserProgress over the internal HTTP routes of
// user-service.
type httpUserProgress struct {
	config *config.Config
}

// CourseOverview implements UserProgress.
func (c *httpUserProgress) CourseOverview(ctx context.Context, userID, courseSlug string) (ProgressOverview, error) {
	var body ProgressOverview

	err := c.getInternalJSON(ctx, "/internal/progress/overview",
		map[string]string{userIDJSONKey: userID, courseSlugJSONKey: courseSlug}, &body)
	if err != nil {
		return ProgressOverview{}, err
	}

	return body, nil
}

// CourseSummaries implements UserProgress.
func (c *httpUserProgress) CourseSummaries(ctx context.Context, userID string, courseSlugs []string) (map[string]CourseSummary, error) {
	var body courseSummariesBody

	err := c.getInternalJSON(ctx, "/internal/progress/course-summaries",
		map[string]string{userIDJSONKey: userID, "courseSlugs": strings.Join(courseSlugs, ",")}, &body)
	if err != nil {
		return nil, err
	}

	return body.Summaries, nil
}

// EnrolledInAnyPath implements UserProgress.
func (c *httpUserProgress) EnrolledInAnyPath(ctx context.Context, userID string, pathSlugs []string) (bool, error) {
	var result pathCheckResponse

	err := c.getInternalJSON(ctx, "/internal/paths/check",
		map[string]string{userIDJSONKey: userID, "pathSlugs": strings.Join(pathSlugs, ",")}, &result)
	if err != nil {
		return false, err
	}

	return result.Enrolled, nil
}

// IsEnrolled implements UserProgress.
func (c *httpUserProgress) IsEnrolled(ctx context.Context, userID, courseSlug string) (bool, error) {
	var result struct {
		Enrolled bool `json:"enrolled"`
	}

	err := c.getInternalJSON(ctx, "/internal/enrollments/check",
		map[string]string{userIDJSONKey: userID, courseSlugJSONKey: courseSlug}, &result)
	if err != nil {
		return false, err
	}

	return result.Enrolled, nil
}

// AutoEnroll implements UserProgress.
func (c *httpUserProgress) AutoEnroll(ctx context.Context, userID, courseSlug string) error {
	return c.postInternal(ctx, "/internal/enrollments/auto", map[string]string{
		userIDJSONKey:     userID,
		courseSlugJSONKey: courseSlug,
	})
}

// MarkLessonComplete implements UserProgress.
func (c *httpUserProgress) MarkLessonComplete(ctx context.Context, userID, courseSlug, lessonSlug string) error {
	return c.postInternal(ctx, "/internal/progress/complete", map[string]string{
		userIDJSONKey:     userID,
		courseSlugJSONKey: courseSlug,
		"lessonSlug":      lessonSlug,
	})
}

// MarkCourseComplete implements UserProgress.
func (c *httpUserProgress) MarkCourseComplete(ctx context.Context, completion CourseCompletion) error {
	return c.postInternal(ctx, "/internal/progress/course-complete", completion)
}

// RecordModule implements UserProgress.
func (c *httpUserProgress) RecordModule(ctx context.Context, result ModuleResult) error {
	return c.postInternal(ctx, "/internal/progress/module", result)
}

// internalURL builds a user-service internal URL with the given query
// parameters.
func (c *httpUserProgress) internalURL(path string, params map[string]string) (string, error) {
	target, err := url.Parse(c.config.UserServiceURL + path)
	if err != nil {
		return "", fmt.Errorf("build user-service URL %s: %w", path, err)
	}

	query := target.Query()
	for key, value := range params {
		query.Set(key, value)
	}

	target.RawQuery = query.Encode()

	return target.String(), nil
}

// setInternalHeader attaches the X-Internal-Secret header to outgoing
// service-to-service requests.
func (c *httpUserProgress) setInternalHeader(req *http.Request) {
	if c.config.InternalSecret != "" {
		req.Header.Set("X-Internal-Secret", c.config.InternalSecret)
	}
}

// getInternalJSON performs an authenticated GET against a user-service
// internal endpoint and decodes the response into dest.
func (c *httpUserProgress) getInternalJSON(ctx context.Context, path string, params map[string]string, dest any) error {
	target, err := c.internalURL(path, params)
	if err != nil {
		return err
	}

	err = httpx.GetJSON(ctx, target, c.setInternalHeader, dest)
	if err != nil {
		return fmt.Errorf("user-service %s: %w", path, err)
	}

	return nil
}

// postInternalTimeout bounds a detached write to user-service, so a slow or
// unreachable dependency cannot leak goroutines indefinitely.
const postInternalTimeout = 10 * time.Second

// postInternal sends payload as JSON to a user-service internal endpoint
// and reports whether it was accepted. The response body is drained so the
// connection returns to the keep-alive pool.
func (c *httpUserProgress) postInternal(ctx context.Context, path string, payload any) error {
	var buf bytes.Buffer

	err := json.NewEncoder(&buf).Encode(payload)
	if err != nil {
		return fmt.Errorf("encode %s payload: %w", path, err)
	}

	//nolint:gosec // URL built from the operator-configured USER_SERVICE_URL and a fixed route
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.config.UserServiceURL+path, &buf)
	if err != nil {
		return fmt.Errorf("build POST %s: %w", path, err)
	}

	req.Header.Set("Content-Type", "application/json")
	c.setInternalHeader(req)

	resp, err := httpx.Do(req) //nolint:bodyclose // httpx.Drain closes it
	if err != nil {
		return fmt.Errorf("POST %s: %w", path, err)
	}
	defer httpx.Drain(resp)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("user-service %s returned %d", path, resp.StatusCode)
	}

	return nil
}

// courseProgress fetches userID's full progress in courseSlug in one call.
//
// A failure is reported as empty progress rather than an error: every
// caller renders the course either way, and treating a user-service blip as
// "nothing completed yet" is what the per-call helpers did before.
func (s *State) courseProgress(ctx context.Context, courseSlug, userID string) *courseProgress {
	body, err := s.users().CourseOverview(ctx, userID, courseSlug)
	if err != nil {
		zap.L().Warn("failed to load progress overview",
			zap.String("courseSlug", courseSlug), zap.Error(err))

		return emptyCourseProgress()
	}

	progress := &courseProgress{
		Enrolled:      body.Enrolled,
		Viewed:        make(map[string]bool, len(body.Viewed)),
		Modules:       make(map[int]moduleProgressData, len(body.Modules)),
		TotalScore:    body.TotalScore,
		PassedModules: make(map[string]bool, len(body.PassedModules)),
		ViewedCount:   body.ViewedCount,
	}

	for _, slug := range body.Viewed {
		progress.Viewed[slug] = true
	}

	for _, row := range body.Modules {
		progress.Modules[row.ModuleIndex] = moduleProgressData{
			BestScore: row.BestScore,
			MaxScore:  row.MaxScore,
			Passed:    row.Passed,
			Attempts:  row.Attempts,
		}
	}

	for _, slug := range body.PassedModules {
		progress.PassedModules[slug] = true
	}

	return progress
}

// courseSummaries fetches the prerequisite-relevant aggregates for every
// course in slugs in one call, keyed by slug. A course the response does
// not mention maps to an empty summary.
func (s *State) courseSummaries(ctx context.Context, userID string, slugs []string) map[string]coursePrereqSummary {
	out := make(map[string]coursePrereqSummary, len(slugs))
	if len(slugs) == 0 {
		return out
	}

	summaries, err := s.users().CourseSummaries(ctx, userID, slugs)
	if err != nil {
		zap.L().Warn("failed to load course summaries", zap.Error(err))

		for _, slug := range slugs {
			out[slug] = emptyCoursePrereqSummary()
		}

		return out
	}

	for _, slug := range slugs {
		row, found := summaries[slug]
		if !found {
			out[slug] = emptyCoursePrereqSummary()

			continue
		}

		summary := coursePrereqSummary{
			TotalScore:    row.TotalScore,
			ViewedCount:   row.ViewedCount,
			PassedModules: make(map[string]bool, len(row.PassedModules)),
		}
		for _, moduleSlug := range row.PassedModules {
			summary.PassedModules[moduleSlug] = true
		}

		out[slug] = summary
	}

	return out
}

// pathEnrollmentCheck reports whether userID is enrolled in any of
// pathSlugs.
func (s *State) pathEnrollmentCheck(ctx context.Context, userID string, pathSlugs []string) bool {
	if len(pathSlugs) == 0 {
		return false
	}

	enrolled, err := s.users().EnrolledInAnyPath(ctx, userID, pathSlugs)
	if err != nil {
		zap.L().Warn("failed to check path enrollment", zap.Error(err))

		return false
	}

	return enrolled
}

// enrollmentCheck reports whether userID is enrolled in courseSlug. Prefer
// courseProgress when the caller also needs progress: it answers both.
func (s *State) enrollmentCheck(ctx context.Context, courseSlug, userID string) bool {
	enrolled, err := s.users().IsEnrolled(ctx, userID, courseSlug)
	if err != nil {
		zap.L().Warn("failed to check enrollment", zap.String("courseSlug", courseSlug), zap.Error(err))

		return false
	}

	return enrolled
}

// detached runs a write to the users domain from a goroutine detached from
// the request lifecycle, on its own bounded context. Used for writes whose
// result cannot change the response that has already been (or is about to
// be) sent: a failure is only logged.
func (s *State) detached(call string, write func(ctx context.Context, users UserProgress) error, fields ...zap.Field) {
	users := s.users()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), postInternalTimeout)
		defer cancel()

		err := write(ctx, users)
		if err != nil {
			zap.L().Warn("detached internal call failed",
				append(fields, zap.String("call", call), zap.Error(err))...)
		}
	}()
}

// skillTotalsFor counts how many courses teach each of a course's skills,
// returning nil when the course teaches none.
func (s *State) skillTotalsFor(ctx context.Context, course *content.Course) map[string]int {
	if len(course.Skills) == 0 {
		return nil
	}

	totals, err := s.Repos.Courses.SkillTotals(ctx, course.Skills)
	if err != nil {
		zap.L().Error("count skill totals failed", zap.String("courseSlug", course.Slug), zap.Error(err))

		return nil
	}

	return totals
}
