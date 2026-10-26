package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/httprate"

	"github.com/jojo91550/pupitre2/apps/api/internal/checker"
	checkerhandlers "github.com/jojo91550/pupitre2/apps/api/internal/checker/handlers"
	courseshandlers "github.com/jojo91550/pupitre2/apps/api/internal/courses/handlers"
	usershandlers "github.com/jojo91550/pupitre2/apps/api/internal/users/handlers"
)

// The adapters below are the only code that knows two domains: each one
// implements an interface a domain declares, by calling the domain that
// owns the data (docs/specs/104-backend-in-process-calls.md). The domains
// themselves never import each other.

// usersProgress gives the courses domain the users domain's progress.
type usersProgress struct {
	users *usershandlers.State
}

var _ courseshandlers.UserProgress = (*usersProgress)(nil)

// CourseOverview implements courseshandlers.UserProgress.
func (a *usersProgress) CourseOverview(ctx context.Context, userID, courseSlug string) (courseshandlers.ProgressOverview, error) {
	overview, err := a.users.ProgressOverview(ctx, userID, courseSlug)
	if err != nil {
		return courseshandlers.ProgressOverview{}, fmt.Errorf("progress overview: %w", err)
	}

	modules := make([]courseshandlers.ModuleProgress, 0, len(overview.Modules))
	for _, row := range overview.Modules {
		modules = append(modules, courseshandlers.ModuleProgress{
			ModuleIndex: row.ModuleIndex,
			BestScore:   row.BestScore,
			MaxScore:    row.MaxScore,
			Passed:      row.Passed,
			Attempts:    row.Attempts,
		})
	}

	return courseshandlers.ProgressOverview{
		Enrolled:      overview.Enrolled,
		Viewed:        overview.Viewed,
		Modules:       modules,
		TotalScore:    int(overview.TotalScore),
		PassedModules: overview.PassedModules,
		ViewedCount:   overview.ViewedCount,
	}, nil
}

// CourseSummaries implements courseshandlers.UserProgress.
func (a *usersProgress) CourseSummaries(ctx context.Context, userID string, courseSlugs []string) (map[string]courseshandlers.CourseSummary, error) {
	summaries, err := a.users.CourseSummaries(ctx, userID, courseSlugs)
	if err != nil {
		return nil, fmt.Errorf("course summaries: %w", err)
	}

	out := make(map[string]courseshandlers.CourseSummary, len(summaries))
	for slug, summary := range summaries {
		out[slug] = courseshandlers.CourseSummary{
			TotalScore:    int(summary.TotalScore),
			PassedModules: summary.PassedModules,
			ViewedCount:   summary.ViewedCount,
		}
	}

	return out, nil
}

// EnrolledInAnyPath implements courseshandlers.UserProgress.
func (a *usersProgress) EnrolledInAnyPath(ctx context.Context, userID string, pathSlugs []string) (bool, error) {
	return a.users.EnrolledInAnyPath(ctx, userID, pathSlugs) //nolint:wrapcheck // same-process call, already wrapped
}

// IsEnrolled implements courseshandlers.UserProgress.
func (a *usersProgress) IsEnrolled(ctx context.Context, userID, courseSlug string) (bool, error) {
	return a.users.IsEnrolled(ctx, userID, courseSlug) //nolint:wrapcheck // same-process call, already wrapped
}

// AutoEnroll implements courseshandlers.UserProgress.
func (a *usersProgress) AutoEnroll(ctx context.Context, userID, courseSlug string) error {
	return a.users.AutoEnroll(ctx, userID, courseSlug) //nolint:wrapcheck // same-process call, already wrapped
}

// MarkLessonComplete implements courseshandlers.UserProgress.
func (a *usersProgress) MarkLessonComplete(ctx context.Context, userID, courseSlug, lessonSlug string) error {
	return a.users.MarkLessonComplete(ctx, userID, courseSlug, lessonSlug) //nolint:wrapcheck // same-process call, already wrapped
}

// MarkCourseComplete implements courseshandlers.UserProgress.
func (a *usersProgress) MarkCourseComplete(ctx context.Context, completion courseshandlers.CourseCompletion) error {
	return a.users.MarkCourseComplete(ctx, usershandlers.CourseCompletion{ //nolint:wrapcheck // same-process call, already wrapped
		UserID:            completion.UserID,
		CourseSlug:        completion.CourseSlug,
		Skills:            completion.Skills,
		Difficulty:        completion.Difficulty,
		SkillTotalCourses: completion.SkillTotalCourses,
	})
}

// RecordModule implements courseshandlers.UserProgress.
func (a *usersProgress) RecordModule(ctx context.Context, result courseshandlers.ModuleResult) error {
	return a.users.RecordModuleProgress(ctx, usershandlers.ModuleResult{ //nolint:wrapcheck // same-process call, already wrapped
		UserID:      result.UserID,
		CourseSlug:  result.CourseSlug,
		ModuleIndex: result.ModuleIndex,
		ModuleSlug:  result.ModuleSlug,
		ModuleType:  result.ModuleType,
		Score:       result.Score,
		MaxScore:    result.MaxScore,
		Passed:      result.Passed,
	})
}

// coursesSource gives the users domain the courses domain's catalog.
//
// The users domain reads the catalog through its own types, which mirror
// the JSON of the batch routes it used to call. Converting through that
// same JSON keeps the two sides in step with the public API contract: a
// field the batch route renames is renamed here too.
type coursesSource struct {
	courses *courseshandlers.State
}

var _ usershandlers.CourseSource = (*coursesSource)(nil)

// Courses implements usershandlers.CourseSource.
func (a *coursesSource) Courses(ctx context.Context, slugs []string) ([]usershandlers.CourseInfo, error) {
	courses, err := a.courses.BatchCourses(ctx, slugs)
	if err != nil {
		return nil, fmt.Errorf("batch courses: %w", err)
	}

	var out []usershandlers.CourseInfo

	err = convert(courses, &out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

// Paths implements usershandlers.CourseSource.
func (a *coursesSource) Paths(ctx context.Context, slugs []string) ([]usershandlers.PathInfo, error) {
	paths, err := a.courses.BatchPaths(ctx, slugs)
	if err != nil {
		return nil, fmt.Errorf("batch paths: %w", err)
	}

	var out []usershandlers.PathInfo

	err = convert(paths, &out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

// SkillModules implements usershandlers.CourseSource.
func (a *coursesSource) SkillModules(ctx context.Context, skills []string) (map[string][]usershandlers.SkillModule, error) {
	modules, err := a.courses.BatchSkillModules(ctx, skills)
	if err != nil {
		return nil, fmt.Errorf("batch skill modules: %w", err)
	}

	var out map[string][]usershandlers.SkillModule

	err = convert(modules, &out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

// PublicCourseSessions implements usershandlers.CourseSource.
func (a *coursesSource) PublicCourseSessions(ctx context.Context, courseSlug string) ([]usershandlers.CourseSessionInfo, error) {
	course, err := a.courses.PublicCourse(ctx, courseSlug)
	if err != nil {
		return nil, fmt.Errorf("public course: %w", err)
	}

	var out []usershandlers.CourseSessionInfo

	err = convert(course.Sessions, &out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

// convert copies src into dst through their JSON form.
func convert(src, dst any) error {
	data, err := json.Marshal(src)
	if err != nil {
		return fmt.Errorf("encode catalog data: %w", err)
	}

	err = json.Unmarshal(data, dst)
	if err != nil {
		return fmt.Errorf("decode catalog data: %w", err)
	}

	return nil
}

// labCheckRateLimitKey is the single key of the lab check limiter: the
// limit is process-wide, as checker-service's was in practice, since
// course-service was its only client (docs/specs/101-backend-configuration.md).
const labCheckRateLimitKey = "lab-checks"

// genericCheckerMessage is what course-service answered when
// checker-service failed without a message of its own.
const genericCheckerMessage = "checker-service error"

// labChecker gives the courses domain the checker.
type labChecker struct {
	checker *checkerhandlers.Handler
	limiter *httprate.RateLimiter
}

var _ courseshandlers.LabChecker = (*labChecker)(nil)

// newLabChecker builds the in-process checker, limited to requests checks
// per window for the whole process; requests 0 disables the limit.
func newLabChecker(handler *checkerhandlers.Handler, requests, windowSeconds int) *labChecker {
	lab := &labChecker{checker: handler}
	if requests > 0 {
		lab.limiter = httprate.NewRateLimiter(requests, time.Duration(windowSeconds)*time.Second)
	}

	return lab
}

// Evaluate implements courseshandlers.LabChecker.
func (a *labChecker) Evaluate(ctx context.Context, req courseshandlers.EvaluateRequest) (courseshandlers.CheckResponse, error) {
	if a.limited(ctx) {
		return courseshandlers.CheckResponse{}, rateLimited()
	}

	result, fail := a.checker.RunEvaluate(ctx, checker.EvaluateRequest(req))

	return checkResult(result, fail)
}

// CheckStep implements courseshandlers.LabChecker.
func (a *labChecker) CheckStep(ctx context.Context, req courseshandlers.StepCheckRequest) (courseshandlers.CheckResponse, error) {
	if a.limited(ctx) {
		return courseshandlers.CheckResponse{}, rateLimited()
	}

	result, fail := a.checker.RunCheckStep(checker.StepRequest(req))

	return checkResult(result, fail)
}

// limited counts one check and reports whether it is over the limit.
func (a *labChecker) limited(ctx context.Context) bool {
	if a.limiter == nil {
		return false
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "/", http.NoBody)
	if err != nil {
		return false
	}

	return a.limiter.OnLimit(headerSink{}, req, labCheckRateLimitKey)
}

// rateLimited is the error of a check refused by the limit. checker-service
// answered 429 with a plain-text body, which course-service relayed as a
// 502 with its generic message (docs/specs/190-backend-defects.md B9).
func rateLimited() error {
	return &courseshandlers.CheckerError{Status: http.StatusBadGateway, Message: genericCheckerMessage}
}

// checkResult turns a checker outcome into what the courses domain
// expects: a non-200 answer of checker-service was relayed as a 502
// carrying its message.
func checkResult(result *checker.EvaluateResponse, fail *checkerhandlers.Failure) (courseshandlers.CheckResponse, error) {
	if fail != nil {
		message := fail.Message
		if message == "" {
			message = genericCheckerMessage
		}

		return courseshandlers.CheckResponse{}, &courseshandlers.CheckerError{Status: http.StatusBadGateway, Message: message}
	}

	return courseshandlers.CheckResponse{Allow: result.Allow, Violations: result.Violations}, nil
}

// headerSink is a ResponseWriter that only keeps headers: the rate limiter
// writes its X-RateLimit-* headers to it, and nobody reads them.
type headerSink struct{}

// Header implements [http.ResponseWriter].
func (headerSink) Header() http.Header { return http.Header{} }

// Write implements [http.ResponseWriter].
func (headerSink) Write(data []byte) (int, error) { return len(data), nil }

// WriteHeader implements [http.ResponseWriter].
func (headerSink) WriteHeader(int) {}
