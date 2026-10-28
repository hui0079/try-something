package com.oa.process;

import com.oa.approval.BizType;
import com.oa.approval.StepCode;

import java.time.Instant;
import java.util.List;

public final class ProcessViews {

    private ProcessViews() {
    }

    public record TodoItem(
            String id,
            BizType bizType,
            long bizId,
            String applicantName,
            String title,
            String summary,
            StepCode stepCode
    ) {
    }

    public record TaskView(
            long id,
            int stepIndex,
            StepCode stepCode,
            long assigneeId,
            String assigneeName,
            TaskStatus status,
            String comment,
            Instant actedAt
    ) {
    }

    public record TimelineEntry(
            long instanceId,
            InstanceStatus status,
            List<TaskView> tasks
    ) {
    }

    public record CcPerson(long userId, String displayName, boolean read) {
    }

    public enum ChainState {
        DONE,
        CURRENT,
        UPCOMING
    }

    public record ChainPerson(
            String taskId,
            long assigneeId,
            String name,
            TaskStatus status,
            String comment
    ) {
    }

    public record ChainNode(
            StepCode stepCode,
            String name,
            ChainState state,
            List<ChainPerson> people
    ) {
    }

    public record ProcessChain(
            long instanceId,
            InstanceStatus status,
            List<ChainNode> nodes
    ) {
    }

    public record DiagramView(
            String xml,
            List<String> completedActivityIds,
            List<String> currentActivityIds
    ) {
    }

    public record CcInboxItem(
            BizType bizType,
            long bizId,
            String title,
            String summary,
            boolean read
    ) {
    }
}
