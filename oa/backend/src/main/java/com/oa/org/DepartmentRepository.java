package com.oa.org;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findAllByOrderByIdAsc();

    long countByParentId(Long parentId);

    long countByLeaderId(Long leaderId);
}
