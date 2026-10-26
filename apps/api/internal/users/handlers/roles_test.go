package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/jojo91550/pupitre2/apps/api/internal/users/fake"
	"github.com/jojo91550/pupitre2/apps/api/internal/users/models"
)

// TestCompleteSSOLogin_GroupAdminsKeepsManager is the regression test for
// defect B21 (docs/specs/190-backend-defects.md): with oidc_group_admins
// set, a manager outside the admin groups stays a manager at sign-in.
func TestCompleteSSOLogin_GroupAdminsKeepsManager(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	providerUserID := "oidc-sub-manager"

	repos := fake.NewRepositories()
	repos.Users = fake.NewUserRepository(models.User{
		ID:             userID,
		Username:       "a-manager",
		Email:          "manager@test.com",
		Role:           groupsRoleManager,
		IsActive:       true,
		AuthProvider:   oidcProviderKey,
		ProviderUserID: &providerUserID,
	})
	groups := fake.NewGroupRepository()
	groups.UserRoles[userID.String()] = groupsRoleManager
	repos.Groups = groups

	s := newStateWithRepos(repos)
	ctx := context.Background()

	rec := httptest.NewRecorder()
	s.completeSSOLogin(ctx, rec, "manager@test.com", "A Manager", nil, nil,
		oidcProviderKey, providerUserID, []string{"pupitre-managers"}, []string{"pupitre-admins"})

	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp authResponse

	err := json.NewDecoder(rec.Body).Decode(&resp)
	if err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if resp.User.Role != groupsRoleManager {
		t.Errorf("role after sign-in = %q, want %q", resp.User.Role, groupsRoleManager)
	}

	persisted, err := repos.Users.FindByEmail(ctx, "manager@test.com")
	if err != nil {
		t.Fatalf("find persisted user: %v", err)
	}

	if persisted.Role != groupsRoleManager {
		t.Errorf("persisted role = %q, want %q", persisted.Role, groupsRoleManager)
	}
}

// TestUpsertGroupMapping_Manager checks that a group can be mapped to the
// manager role through the admin API (defect B20; the database constraint
// is covered by the integration tests).
func TestUpsertGroupMapping_Manager(t *testing.T) {
	t.Parallel()

	r := newTestRouter()

	rec := htDo(t, r, http.MethodPost, "/api/admin/groups/mappings",
		`{"groupName":"pupitre-managers","platformRole":"manager"}`, htAuthHeader(t, "admin"))
	if rec.Code != http.StatusOK {
		t.Fatalf("map a group to manager: %d %s", rec.Code, rec.Body.String())
	}
}
