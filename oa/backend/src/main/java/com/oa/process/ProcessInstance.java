package com.oa.process;

import com.oa.approval.BizType;
import com.oa.org.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "process_instance")
public class ProcessInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "biz_type", nullable = false, length = 20)
    private BizType bizType;

    @Column(name = "biz_id", nullable = false)
    private Long bizId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id", nullable = false)
    private UserAccount applicant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InstanceStatus status;

    @Column(name = "steps_snapshot", nullable = false, columnDefinition = "text")
    private String stepsSnapshot;

    @Column(name = "current_step_index", nullable = false)
    private int currentStepIndex;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "flowable_process_id", length = 64)
    private String flowableProcessId;

    public Long getId() {
        return id;
    }

    public BizType getBizType() {
        return bizType;
    }

    public void setBizType(BizType bizType) {
        this.bizType = bizType;
    }

    public Long getBizId() {
        return bizId;
    }

    public void setBizId(Long bizId) {
        this.bizId = bizId;
    }

    public UserAccount getApplicant() {
        return applicant;
    }

    public void setApplicant(UserAccount applicant) {
        this.applicant = applicant;
    }

    public InstanceStatus getStatus() {
        return status;
    }

    public void setStatus(InstanceStatus status) {
        this.status = status;
    }

    public String getStepsSnapshot() {
        return stepsSnapshot;
    }

    public void setStepsSnapshot(String stepsSnapshot) {
        this.stepsSnapshot = stepsSnapshot;
    }

    public int getCurrentStepIndex() {
        return currentStepIndex;
    }

    public void setCurrentStepIndex(int currentStepIndex) {
        this.currentStepIndex = currentStepIndex;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getFlowableProcessId() {
        return flowableProcessId;
    }

    public void setFlowableProcessId(String flowableProcessId) {
        this.flowableProcessId = flowableProcessId;
    }
}
