package server

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	checkerconfig "github.com/jojo91550/pupitre2/apps/api/internal/checker/config"
	checkerhandlers "github.com/jojo91550/pupitre2/apps/api/internal/checker/handlers"
	coursesconfig "github.com/jojo91550/pupitre2/apps/api/internal/courses/config"
	"github.com/jojo91550/pupitre2/apps/api/internal/courses/content"
	coursesfake "github.com/jojo91550/pupitre2/apps/api/internal/courses/fake"
	courseshandlers "github.com/jojo91550/pupitre2/apps/api/internal/courses/handlers"
	coursesrepo "github.com/jojo91550/pupitre2/apps/api/internal/courses/repository"
	"github.com/jojo91550/pupitre2/apps/api/internal/platform/config"
	"github.com/jojo91550/pupitre2/apps/api/internal/platform/middleware"
	usersconfig "github.com/jojo91550/pupitre2/apps/api/internal/users/config"
	usersfake "github.com/jojo91550/pupitre2/apps/api/internal/users/fake"
	usersrepo "github.com/jojo91550/pupitre2/apps/api/internal/users/repository"
)

// learnerID is the learner of the wiring tests.
const learnerID = "11111111-1111-1111-1111-111111111111"

// wiredApp is the monolith on fake repositories.
type wiredApp struct {
	router     *chi.Mux
	domains    Domains
	usersRepos *usersrepo.Repositories
	token      string
}

// newWiredApp wires both domains on fakes, with one public course of two
// lessons.
func newWiredApp(t *testing.T) *wiredApp {
	t.Helper()

	cfg := &config.Config{
		Port:    8080,
		Users:   &usersconfig.Config{JWTSecret: testJWTSecret, LeaderboardMaxEntries: 20},
		Courses: &coursesconfig.Config{JWTSecret: testJWTSecret},
		Checker: &checkerconfig.Config{RateLimitRequests: 1, RateLimitWindowSeconds: 60},
	}

	usersRepos := usersfake.NewRepositories()
	coursesRepos := &coursesrepo.Repositories{
		Courses: coursesfake.NewCourseRepository(&content.Course{
			Slug:       "k8s",
			Title:      "Kubernetes",
			Difficulty: "beginner",
			IsPublic:   true,
			Skills:     []string{"kubernetes"},
			Modules: []content.Module{
				{Name: "Intro", Type: "text", InlineContent: "Hello", Skills: []string{"kubernetes"}},
				{Name: "Next", Type: "text", InlineContent: "More"},
			},
		}),
		Paths:        coursesfake.NewPathRepository(),
		QuizAttempts: coursesfake.NewQuizAttemptRepository(),
		LabChecks:    coursesfake.NewLabCheckRepository(),
	}

	domains := Wire(cfg, usersRepos, coursesRepos)

	token, err := middleware.CreateToken(learnerID, "learner@example.com", "student", "learner", testJWTSecret, 1)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	return &wiredApp{router: BuildRouter(domains, cfg, false), domains: domains, usersRepos: usersRepos, token: token}
}

// do sends a request as the learner.
func (a *wiredApp) do(t *testing.T, method, path string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequestWithContext(t.Context(), method, path, http.NoBody)
	req.Header.Set("Authorization", "Bearer "+a.token)

	rec := httptest.NewRecorder()
	a.router.ServeHTTP(rec, req)

	return rec
}

// eventually polls cond until it holds or a second passes: detached calls
// run on their own goroutine.
func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}

		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("%s did not happen", what)
}

// TestWiring_LearnerFlow runs a learner through a course across both
// domains: the courses domain enrolls and records progress in the users
// domain, which reads course titles back from the courses domain.
func TestWiring_LearnerFlow(t *testing.T) {
	t.Parallel()

	app := newWiredApp(t)
	ctx := t.Context()

	// Opening a module of a public course enrolls the learner (detached).
	rec := app.do(t, http.MethodGet, "/api/courses/k8s/modules/0")
	if rec.Code != http.StatusOK {
		t.Fatalf("open module: %d %s", rec.Code, rec.Body.String())
	}

	eventually(t, "auto-enrollment", func() bool {
		enrolled, err := app.domains.Users.IsEnrolled(ctx, learnerID, "k8s")

		return err == nil && enrolled
	})

	// Completing a lesson is recorded in the users domain, with its XP.
	rec = app.do(t, http.MethodPost, "/api/courses/k8s/lessons/intro/complete")
	if rec.Code != http.StatusOK {
		t.Fatalf("complete lesson: %d %s", rec.Code, rec.Body.String())
	}

	overview, err := app.domains.Users.ProgressOverview(ctx, learnerID, "k8s")
	if err != nil {
		t.Fatalf("progress overview: %v", err)
	}

	if !overview.Enrolled || len(overview.Viewed) != 1 || overview.Viewed[0] != "intro" {
		t.Fatalf("overview after one lesson = %+v", overview)
	}

	total, err := app.usersRepos.XP.Total(ctx, learnerID)
	if err != nil || total != 10 {
		t.Fatalf("XP after one lesson = %d, %v; want 10", total, err)
	}

	// The course page reads that progress back from the users domain.
	rec = app.do(t, http.MethodGet, "/api/courses/k8s/modules")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"viewed":true`) {
		t.Fatalf("modules after one lesson: %d %s", rec.Code, rec.Body.String())
	}

	// Completing the last lesson completes the course: badge and course XP.
	rec = app.do(t, http.MethodPost, "/api/courses/k8s/lessons/next/complete")
	if rec.Code != http.StatusOK {
		t.Fatalf("complete last lesson: %d %s", rec.Code, rec.Body.String())
	}

	total, err = app.usersRepos.XP.Total(ctx, learnerID)
	if err != nil || total != 220 {
		t.Fatalf("XP after the course = %d, %v; want 220", total, err)
	}

	// The users domain names the course through the catalog adapter.
	rec = app.do(t, http.MethodGet, "/api/my/courses")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Kubernetes") {
		t.Fatalf("my courses: %d %s", rec.Code, rec.Body.String())
	}
}

// failingProgress is a users domain whose every call fails.
type failingProgress struct{}

// errUsersDown is the error every failingProgress call returns.
var errUsersDown = errors.New("users domain unavailable")

// CourseOverview fails.
func (failingProgress) CourseOverview(context.Context, string, string) (courseshandlers.ProgressOverview, error) {
	return courseshandlers.ProgressOverview{}, errUsersDown
}

// CourseSummaries fails.
func (failingProgress) CourseSummaries(context.Context, string, []string) (map[string]courseshandlers.CourseSummary, error) {
	return nil, errUsersDown
}

// EnrolledInAnyPath fails.
func (failingProgress) EnrolledInAnyPath(context.Context, string, []string) (bool, error) {
	return false, errUsersDown
}

// IsEnrolled fails.
func (failingProgress) IsEnrolled(context.Context, string, string) (bool, error) {
	return false, errUsersDown
}

// AutoEnroll fails.
func (failingProgress) AutoEnroll(context.Context, string, string) error { return errUsersDown }

// MarkLessonComplete fails.
func (failingProgress) MarkLessonComplete(context.Context, string, string, string) error {
	return errUsersDown
}

// MarkCourseComplete fails.
func (failingProgress) MarkCourseComplete(context.Context, courseshandlers.CourseCompletion) error {
	return errUsersDown
}

// RecordModule fails.
func (failingProgress) RecordModule(context.Context, courseshandlers.ModuleResult) error {
	return errUsersDown
}

// TestWiring_UsersFailureSemantics checks the failure rules of spec 104: a
// failing read degrades to empty progress, a failing lesson completion
// fails the request with the message course-service used.
func TestWiring_UsersFailureSemantics(t *testing.T) {
	t.Parallel()

	app := newWiredApp(t)
	app.domains.Courses.Users = failingProgress{}

	rec := app.do(t, http.MethodGet, "/api/courses/k8s/modules")
	if rec.Code != http.StatusOK || strings.Contains(rec.Body.String(), `"viewed":true`) {
		t.Fatalf("modules with users down: %d %s", rec.Code, rec.Body.String())
	}

	rec = app.do(t, http.MethodPost, "/api/courses/k8s/lessons/intro/complete")
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), "Failed to mark lesson as complete") {
		t.Fatalf("complete lesson with users down: %d %s", rec.Code, rec.Body.String())
	}
}

// TestWiring_LabCheckerLimit checks the in-process checker: its refusals
// reach the learner as a 502 with the checker's message, and the
// process-wide limit answers like checker-service's did.
func TestWiring_LabCheckerLimit(t *testing.T) {
	t.Parallel()

	checker := newLabChecker(checkerhandlers.New(&checkerconfig.Config{GitLabBaseURL: "http://gitlab.invalid"}), 1, 60)
	req := courseshandlers.EvaluateRequest{
		Username: "u", Project: "p", PolicySrc: "http://gitlab.invalid/r", PolicyRef: "main", PolicyPath: "check.rego",
	}

	_, err := checker.Evaluate(t.Context(), req)

	var checkerErr *courseshandlers.CheckerError
	if !errors.As(err, &checkerErr) || checkerErr.Status != http.StatusBadGateway || checkerErr.Message != "GITLAB_TOKEN not configured" {
		t.Fatalf("first check: %v, want 502 GITLAB_TOKEN not configured", err)
	}

	_, err = checker.Evaluate(t.Context(), req)
	if !errors.As(err, &checkerErr) || checkerErr.Status != http.StatusBadGateway || checkerErr.Message != "checker-service error" {
		t.Fatalf("second check: %v, want the rate-limit 502", err)
	}
}
