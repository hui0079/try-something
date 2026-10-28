package com.oa.process;

import com.oa.approval.ApprovalProblem;
import com.oa.approval.ResolvedStep;
import com.oa.approval.StepCode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FlowEngineTest {

    @Test
    void approveWalksToTheNextStepAndThenFinishes() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L)),
                new ResolvedStep(StepCode.DEPT_HEAD, List.of(3L))
        ));
        assertEquals(InstanceStatus.RUNNING, started.status());
        assertEquals(1, started.tasks().size());

        FlowState second = FlowEngine.approve(started, 2L, "同意");
        assertEquals(InstanceStatus.RUNNING, second.status());
        assertEquals(1, second.currentStepIndex());
        assertEquals(3L, second.tasks().get(1).assigneeId());

        FlowState done = FlowEngine.approve(second, 3L, null);
        assertEquals(InstanceStatus.APPROVED, done.status());
    }

    @Test
    void orSignFirstDecisionCancelsTheOtherTask() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.FINANCE, List.of(4L, 5L))
        ));
        FlowState approved = FlowEngine.approve(started, 4L, "通过");
        assertEquals(InstanceStatus.APPROVED, approved.status());
        assertEquals(TaskStatus.APPROVED, approved.tasks().get(0).status());
        assertEquals(TaskStatus.CANCELLED, approved.tasks().get(1).status());

        FlowState rejected = FlowEngine.reject(started, 5L, "缺少发票");
        assertEquals(InstanceStatus.REJECTED, rejected.status());
        assertEquals(TaskStatus.CANCELLED, rejected.tasks().get(0).status());
        assertEquals(TaskStatus.REJECTED, rejected.tasks().get(1).status());
    }

    @Test
    void outsiderCannotAct() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L))
        ));
        assertEquals("NOT_ASSIGNEE", assertThrows(
                ApprovalProblem.class,
                () -> FlowEngine.approve(started, 9L, null)
        ).code());
    }

    @Test
    void cancelIsAllowedUntilSomeoneApproves() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L)),
                new ResolvedStep(StepCode.FINANCE, List.of(4L))
        ));
        FlowState cancelled = FlowEngine.cancel(started);
        assertEquals(InstanceStatus.CANCELLED, cancelled.status());
        assertEquals(TaskStatus.CANCELLED, cancelled.tasks().get(0).status());

        FlowState afterManager = FlowEngine.approve(started, 2L, null);
        assertEquals("CANNOT_CANCEL", assertThrows(ApprovalProblem.class, () -> FlowEngine.cancel(afterManager)).code());
    }

    @Test
    void transferReplacesOnlyTheActorsTask() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.FINANCE, List.of(4L, 5L))
        ));
        FlowState transferred = FlowEngine.transfer(started, 4L, 7L, 1L, "请你看一下");
        assertEquals(InstanceStatus.RUNNING, transferred.status());
        assertEquals(TaskStatus.TRANSFERRED, transferred.tasks().get(0).status());
        assertEquals(TaskStatus.PENDING, transferred.tasks().get(1).status());
        assertEquals(5L, transferred.tasks().get(1).assigneeId());
        assertEquals(TaskStatus.PENDING, transferred.tasks().get(2).status());
        assertEquals(7L, transferred.tasks().get(2).assigneeId());
    }

    @Test
    void transferRejectsSelfApplicantAndFinishedFlow() {
        FlowState started = FlowEngine.start(List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L))
        ));
        assertEquals("INVALID_TRANSFER", assertThrows(
                ApprovalProblem.class,
                () -> FlowEngine.transfer(started, 2L, 2L, 1L, null)
        ).code());
        assertEquals("INVALID_TRANSFER", assertThrows(
                ApprovalProblem.class,
                () -> FlowEngine.transfer(started, 2L, 1L, 1L, null)
        ).code());
        FlowState approved = FlowEngine.approve(started, 2L, null);
        assertEquals("INVALID_STATE", assertThrows(
                ApprovalProblem.class,
                () -> FlowEngine.transfer(approved, 2L, 7L, 1L, null)
        ).code());
    }

    @Test
    void emptyPlanFinishesImmediately() {
        FlowState started = FlowEngine.start(List.of());
        assertEquals(InstanceStatus.APPROVED, started.status());
        assertEquals(0, started.tasks().size());
    }
}
