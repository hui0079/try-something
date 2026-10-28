package com.oa.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExpenseRequestRepository extends JpaRepository<ExpenseRequest, Long> {

    List<ExpenseRequest> findByApplicantIdOrderByIdDesc(Long applicantId);

    List<ExpenseRequest> findByIdIn(Collection<Long> ids);
}
