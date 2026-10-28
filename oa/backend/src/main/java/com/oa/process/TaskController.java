package com.oa.process;

import com.oa.auth.AppUserPrincipal;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final ProcessService processes;

    public TaskController(ProcessService processes) {
        this.processes = processes;
    }

    @GetMapping
    List<ProcessViews.TodoItem> list(Authentication authentication) {
        return processes.listTodos(principal(authentication).id());
    }

    @PostMapping("/{id}/approve")
    Map<String, Boolean> approve(
            @PathVariable String id,
            @RequestBody(required = false) CommentRequest request,
            Authentication authentication
    ) {
        long actorId = principal(authentication).id();
        String comment = request == null ? null : request.comment();
        if (id.startsWith(FlowableApprovalEngine.TASK_PREFIX)) {
            processes.approveFlowable(id.substring(FlowableApprovalEngine.TASK_PREFIX.length()), actorId, comment);
        } else {
            processes.approve(Long.parseLong(id), actorId, comment);
        }
        return Map.of("success", true);
    }

    @PostMapping("/{id}/reject")
    Map<String, Boolean> reject(
            @PathVariable String id,
            @RequestBody(required = false) CommentRequest request,
            Authentication authentication
    ) {
        long actorId = principal(authentication).id();
        String comment = request == null ? null : request.comment();
        if (id.startsWith(FlowableApprovalEngine.TASK_PREFIX)) {
            processes.rejectFlowable(id.substring(FlowableApprovalEngine.TASK_PREFIX.length()), actorId, comment);
        } else {
            processes.reject(Long.parseLong(id), actorId, comment);
        }
        return Map.of("success", true);
    }

    @PostMapping("/{id}/transfer")
    Map<String, Boolean> transfer(
            @PathVariable String id,
            @Valid @RequestBody TransferRequest request,
            Authentication authentication
    ) {
        long actorId = principal(authentication).id();
        if (id.startsWith(FlowableApprovalEngine.TASK_PREFIX)) {
            processes.transferFlowable(
                    id.substring(FlowableApprovalEngine.TASK_PREFIX.length()),
                    actorId,
                    request.targetUserId(),
                    request.comment()
            );
        } else {
            processes.transfer(Long.parseLong(id), actorId, request.targetUserId(), request.comment());
        }
        return Map.of("success", true);
    }

    private AppUserPrincipal principal(Authentication authentication) {
        return (AppUserPrincipal) authentication.getPrincipal();
    }

    public record CommentRequest(@Size(max = 500) String comment) {
    }

    public record TransferRequest(@NotNull Long targetUserId, @Size(max = 500) String comment) {
    }
}
