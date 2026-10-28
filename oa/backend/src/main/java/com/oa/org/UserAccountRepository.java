package com.oa.org;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    long countByDepartmentId(Long departmentId);

    long countByManagerId(Long managerId);

    long countByRole(Role role);

    @EntityGraph(attributePaths = {"department", "department.leader", "manager"})
    List<UserAccount> findAllByOrderByIdAsc();
}
