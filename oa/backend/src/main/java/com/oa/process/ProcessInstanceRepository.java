package com.oa.process;

import com.oa.approval.BizType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProcessInstanceRepository extends JpaRepository<ProcessInstance, Long> {

    List<ProcessInstance> findByBizTypeAndBizIdOrderByIdAsc(BizType bizType, Long bizId);

    Optional<ProcessInstance> findFirstByBizTypeAndBizIdOrderByIdDesc(BizType bizType, Long bizId);

    Optional<ProcessInstance> findByFlowableProcessId(String flowableProcessId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select instance from ProcessInstance instance where instance.id = :id")
    Optional<ProcessInstance> findLockedById(@Param("id") Long id);
}
