package com.oa.approval;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalRouteRepository extends JpaRepository<ApprovalRoute, Long> {

    List<ApprovalRoute> findAllByOrderByBizTypeAscPriorityDesc();
}
