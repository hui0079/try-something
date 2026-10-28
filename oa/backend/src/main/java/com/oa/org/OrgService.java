package com.oa.org;

import com.oa.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OrgService {

    private final DepartmentRepository departments;
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;

    public OrgService(
            DepartmentRepository departments,
            UserAccountRepository users,
            PasswordEncoder passwordEncoder
    ) {
        this.departments = departments;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> listDepartments() {
        return departments.findAllByOrderByIdAsc().stream().map(this::toDepartment).toList();
    }

    @Transactional
    public DepartmentResponse createDepartment(String name, Long parentId) {
        Department department = new Department();
        department.setName(requireName(name));
        department.setParent(parent(parentId));
        return toDepartment(departments.save(department));
    }

    @Transactional
    public DepartmentResponse updateDepartment(long id, String name, Long parentId, Long leaderId) {
        Department department = requireDepartment(id);
        department.setName(requireName(name));
        Department parent = parent(parentId);
        if (parent != null) {
            ensureNoCycle(department, parent);
        }
        department.setParent(parent);
        department.setLeader(leaderId == null ? null : requireUser(leaderId));
        return toDepartment(department);
    }

    @Transactional
    public void deleteDepartment(long id) {
        requireDepartment(id);
        if (departments.countByParentId(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_IN_USE", "还有下级部门，不能删除");
        }
        if (users.countByDepartmentId(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_IN_USE", "部门下还有员工，不能删除");
        }
        departments.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<DirectoryEntry> listDirectory() {
        return users.findAllByOrderByIdAsc().stream()
                .map(user -> new DirectoryEntry(user.getId(), user.getDisplayName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return users.findAllByOrderByIdAsc().stream().map(this::toUser).toList();
    }

    @Transactional
    public UserResponse createUser(
            String username,
            String password,
            String displayName,
            Long departmentId,
            Long managerId,
            Role role
    ) {
        String normalized = normalizeUsername(username);
        if (users.existsByUsernameIgnoreCase(normalized)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_EXISTS", "用户名已存在");
        }
        if (password == null || password.length() < 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "密码至少 6 位");
        }
        UserAccount user = new UserAccount();
        user.setUsername(normalized);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(requireName(displayName));
        user.setDepartment(departmentId == null ? null : requireDepartment(departmentId));
        user.setRole(role);
        users.save(user);
        user.setManager(resolveManager(managerId, user.getId()));
        return toUser(user);
    }

    @Transactional
    public UserResponse updateUser(
            long id,
            String displayName,
            String password,
            Long departmentId,
            Long managerId,
            Role role
    ) {
        UserAccount user = requireUser(id);
        if (user.getRole() == Role.ADMIN && role != Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "LAST_ADMIN", "至少保留一名管理员");
        }
        user.setDisplayName(requireName(displayName));
        user.setDepartment(departmentId == null ? null : requireDepartment(departmentId));
        user.setManager(resolveManager(managerId, user.getId()));
        user.setRole(role);
        if (password != null && !password.isBlank()) {
            if (password.length() < 6) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "密码至少 6 位");
            }
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        return toUser(user);
    }

    @Transactional
    public void deleteUser(long id, long actorId) {
        if (id == actorId) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_DELETE_SELF", "不能删除自己");
        }
        UserAccount user = requireUser(id);
        if (user.getRole() == Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "LAST_ADMIN", "至少保留一名管理员");
        }
        if (users.countByManagerId(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_IN_USE", "还有员工以这个人为直属主管");
        }
        if (departments.countByLeaderId(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_IN_USE", "这个人还是部门负责人");
        }
        users.delete(user);
    }

    private UserAccount resolveManager(Long managerId, long userId) {
        if (managerId == null) {
            return null;
        }
        if (managerId == userId) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MANAGER", "不能把自己设成直属主管");
        }
        return requireUser(managerId);
    }

    private void ensureNoCycle(Department department, Department parent) {
        Department cursor = parent;
        while (cursor != null) {
            if (cursor.getId().equals(department.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DEPARTMENT_CYCLE", "部门的上级不能是自己或下级");
            }
            cursor = cursor.getParent();
        }
    }

    private Department parent(Long parentId) {
        return parentId == null ? null : requireDepartment(parentId);
    }

    private Department requireDepartment(long id) {
        return departments.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "部门不存在"));
    }

    private UserAccount requireUser(long id) {
        return users.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "用户不存在"));
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "名称不能为空");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 80) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "名称不能超过 80 个字");
        }
        return trimmed;
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "用户名不能为空");
        }
        String normalized = username.trim().toLowerCase();
        if (normalized.length() > 64) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "用户名不能超过 64 个字符");
        }
        return normalized;
    }

    private DepartmentResponse toDepartment(Department department) {
        Department parent = department.getParent();
        UserAccount leader = department.getLeader();
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                parent == null ? null : parent.getId(),
                parent == null ? null : parent.getName(),
                leader == null ? null : leader.getId(),
                leader == null ? null : leader.getDisplayName()
        );
    }

    private UserResponse toUser(UserAccount user) {
        Department department = user.getDepartment();
        UserAccount manager = user.getManager();
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                department == null ? null : department.getId(),
                department == null ? null : department.getName(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getDisplayName(),
                user.getRole()
        );
    }

    public record DirectoryEntry(long id, String displayName) {
    }

    public record DepartmentResponse(
            long id,
            String name,
            Long parentId,
            String parentName,
            Long leaderId,
            String leaderName
    ) {
    }

    public record UserResponse(
            long id,
            String username,
            String displayName,
            Long departmentId,
            String departmentName,
            Long managerId,
            String managerName,
            Role role
    ) {
    }
}
