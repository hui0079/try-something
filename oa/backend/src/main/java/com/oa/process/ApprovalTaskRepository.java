package com.oa.process;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalTaskRepository extends JpaRepository<ApprovalTask, Long> {

    List<ApprovalTask> findByAssigneeIdAndStatusOrderByIdDesc(Long assigneeId, TaskStatus status);

    List<ApprovalTask> findByInstanceIdOrderByIdAsc(Long instanceId);
}
