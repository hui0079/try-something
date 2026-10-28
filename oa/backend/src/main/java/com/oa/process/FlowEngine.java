package com.oa.process;

import com.oa.approval.ApprovalProblem;
import com.oa.approval.ResolvedStep;

import java.util.ArrayList;
import java.util.List;

public final class FlowEngine {

    private FlowEngine() {
    }

    public static FlowState start(List<ResolvedStep> steps) {
        List<ResolvedStep> frozen = List.copyOf(steps);
        if (frozen.isEmpty()) {
            return new FlowState(InstanceStatus.APPROVED, 0, frozen, List.of());
        }
        return new FlowState(InstanceStatus.RUNNING, 0, frozen, open(frozen.get(0), 0));
    }

    public static FlowState approve(FlowState state, long actorId, String comment) {
        ensureRunning(state);
        List<TaskState> tasks = new ArrayList<>(state.tasks());
        int index = state.currentStepIndex();
        int hit = indexOfPending(tasks, index, actorId);
        tasks.set(hit, tasks.get(hit).withStatus(TaskStatus.APPROVED, comment));
        cancelPending(tasks, index, hit);
        int nextIndex = index + 1;
        if (nextIndex >= state.steps().size()) {
            return new FlowState(InstanceStatus.APPROVED, index, state.steps(), List.copyOf(tasks));
        }
        tasks.addAll(open(state.steps().get(nextIndex), nextIndex));
        return new FlowState(InstanceStatus.RUNNING, nextIndex, state.steps(), List.copyOf(tasks));
    }

    public static FlowState reject(FlowState state, long actorId, String comment) {
        ensureRunning(state);
        List<TaskState> tasks = new ArrayList<>(state.tasks());
        int index = state.currentStepIndex();
        int hit = indexOfPending(tasks, index, actorId);
        tasks.set(hit, tasks.get(hit).withStatus(TaskStatus.REJECTED, comment));
        cancelPending(tasks, index, hit);
        return new FlowState(InstanceStatus.REJECTED, index, state.steps(), List.copyOf(tasks));
    }

    public static FlowState transfer(
            FlowState state,
            long actorId,
            long targetId,
            long applicantId,
            String comment
    ) {
        ensureRunning(state);
        if (targetId == actorId) {
            throw new ApprovalProblem("INVALID_TRANSFER", "不能转给自己");
        }
        if (targetId == applicantId) {
            throw new ApprovalProblem("INVALID_TRANSFER", "不能转给申请人");
        }
        List<TaskState> tasks = new ArrayList<>(state.tasks());
        int index = state.currentStepIndex();
        boolean alreadyPending = tasks.stream().anyMatch(task ->
                task.stepIndex() == index
                        && task.assigneeId() == targetId
                        && task.status() == TaskStatus.PENDING);
        if (alreadyPending) {
            throw new ApprovalProblem("INVALID_TRANSFER", "对方已经是当前审批人");
        }
        int hit = indexOfPending(tasks, index, actorId);
        var stepCode = tasks.get(hit).stepCode();
        tasks.set(hit, tasks.get(hit).withStatus(TaskStatus.TRANSFERRED, comment));
        tasks.add(new TaskState(null, index, stepCode, targetId, TaskStatus.PENDING, null));
        return new FlowState(InstanceStatus.RUNNING, index, state.steps(), List.copyOf(tasks));
    }

    public static FlowState cancel(FlowState state) {
        ensureRunning(state);
        boolean someoneApproved = state.tasks().stream()
                .anyMatch(task -> task.status() == TaskStatus.APPROVED);
        if (someoneApproved) {
            throw new ApprovalProblem("CANNOT_CANCEL", "已经有人通过，不能撤回");
        }
        List<TaskState> tasks = new ArrayList<>();
        for (TaskState task : state.tasks()) {
            if (task.status() == TaskStatus.PENDING) {
                tasks.add(task.withStatus(TaskStatus.CANCELLED, null));
            } else {
                tasks.add(task);
            }
        }
        return new FlowState(InstanceStatus.CANCELLED, state.currentStepIndex(), state.steps(), List.copyOf(tasks));
    }

    private static void ensureRunning(FlowState state) {
        if (state.status() != InstanceStatus.RUNNING) {
            throw new ApprovalProblem("INVALID_STATE", "流程已经结束");
        }
    }

    private static List<TaskState> open(ResolvedStep step, int stepIndex) {
        return step.assigneeIds().stream()
                .map(assigneeId -> new TaskState(null, stepIndex, step.code(), assigneeId, TaskStatus.PENDING, null))
                .toList();
    }

    private static int indexOfPending(List<TaskState> tasks, int stepIndex, long actorId) {
        for (int index = 0; index < tasks.size(); index++) {
            TaskState task = tasks.get(index);
            if (task.stepIndex() == stepIndex
                    && task.assigneeId() == actorId
                    && task.status() == TaskStatus.PENDING) {
                return index;
            }
        }
        throw new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人");
    }

    private static void cancelPending(List<TaskState> tasks, int stepIndex, int actedIndex) {
        for (int index = 0; index < tasks.size(); index++) {
            if (index == actedIndex) {
                continue;
            }
            TaskState task = tasks.get(index);
            if (task.stepIndex() == stepIndex && task.status() == TaskStatus.PENDING) {
                tasks.set(index, task.withStatus(TaskStatus.CANCELLED, null));
            }
        }
    }
}
