package com.oa.org;

import com.oa.auth.AppUserPrincipal;
import com.oa.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OrgController {

    private final OrgService org;

    public OrgController(OrgService org) {
        this.org = org;
    }

    @GetMapping("/directory")
    List<OrgService.DirectoryEntry> directory() {
        return org.listDirectory();
    }

    @GetMapping("/departments")
    List<OrgService.DepartmentResponse> departments(Authentication authentication) {
        requireAdmin(authentication);
        return org.listDepartments();
    }

    @PostMapping("/departments")
    ResponseEntity<OrgService.DepartmentResponse> createDepartment(
            @Valid @RequestBody DepartmentRequest request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(org.createDepartment(request.name(), request.parentId()));
    }

    @PutMapping("/departments/{id}")
    OrgService.DepartmentResponse updateDepartment(
            @PathVariable long id,
            @Valid @RequestBody DepartmentUpdate request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return org.updateDepartment(id, request.name(), request.parentId(), request.leaderId());
    }

    @DeleteMapping("/departments/{id}")
    ResponseEntity<Void> deleteDepartment(@PathVariable long id, Authentication authentication) {
        requireAdmin(authentication);
        org.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users")
    List<OrgService.UserResponse> users(Authentication authentication) {
        requireAdmin(authentication);
        return org.listUsers();
    }

    @PostMapping("/users")
    ResponseEntity<OrgService.UserResponse> createUser(
            @Valid @RequestBody UserCreate request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(org.createUser(
                request.username(),
                request.password(),
                request.displayName(),
                request.departmentId(),
                request.managerId(),
                request.role()
        ));
    }

    @PutMapping("/users/{id}")
    OrgService.UserResponse updateUser(
            @PathVariable long id,
            @Valid @RequestBody UserUpdate request,
            Authentication authentication
    ) {
        requireAdmin(authentication);
        return org.updateUser(
                id,
                request.displayName(),
                request.password(),
                request.departmentId(),
                request.managerId(),
                request.role()
        );
    }

    @DeleteMapping("/users/{id}")
    ResponseEntity<Void> deleteUser(@PathVariable long id, Authentication authentication) {
        AppUserPrincipal actor = requireAdmin(authentication);
        org.deleteUser(id, actor.id());
        return ResponseEntity.noContent().build();
    }

    private AppUserPrincipal requireAdmin(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        if (principal.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "需要管理员权限");
        }
        return principal;
    }

    public record DepartmentRequest(@NotBlank String name, Long parentId) {
    }

    public record DepartmentUpdate(@NotBlank String name, Long parentId, Long leaderId) {
    }

    public record UserCreate(
            @NotBlank String username,
            @NotBlank String password,
            @NotBlank String displayName,
            Long departmentId,
            Long managerId,
            @NotNull Role role
    ) {
    }

    public record UserUpdate(
            @NotBlank String displayName,
            String password,
            Long departmentId,
            Long managerId,
            @NotNull Role role
    ) {
    }
}
