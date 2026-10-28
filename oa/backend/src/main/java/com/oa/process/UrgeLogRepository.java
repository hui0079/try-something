package com.oa.process;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UrgeLogRepository extends JpaRepository<UrgeLog, Long> {

    Optional<UrgeLog> findFirstByInstanceIdAndStepIndexOrderByCreatedAtDesc(Long instanceId, int stepIndex);
}
