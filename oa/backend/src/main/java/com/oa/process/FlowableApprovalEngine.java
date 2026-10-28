package com.oa.process;

import com.oa.approval.ApprovalProblem;
import com.oa.approval.BizType;
import com.oa.approval.ResolvedStep;
import com.oa.approval.StepCode;
import com.oa.org.UserAccount;
import com.oa.org.UserAccountRepository;
import org.flowable.common.engine.api.FlowableObjectNotFoundException;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.engine.task.Comment;
import org.flowable.task.api.Task;
import org.flowable.task.api.history.HistoricTaskInstance;
import org.flowable.variable.api.history.HistoricVariableInstance;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FlowableApprovalEngine {

    static final String TASK_PREFIX = "f-";

    private final RepositoryService repositoryService;
    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final HistoryService historyService;
    private final UserAccountRepository users;
    private final ConcurrentHashMap<String, Boolean> deployed = new ConcurrentHashMap<>();

    public FlowableApprovalEngine(
            RepositoryService repositoryService,
            RuntimeService runtimeService,
            TaskService taskService,
            HistoryService historyService,
            UserAccountRepository users
    ) {
        this.repositoryService = repositoryService;
        this.runtimeService = runtimeService;
        this.taskService = taskService;
        this.historyService = historyService;
        this.users = users;
    }

    public String start(BizType bizType, long bizId, long applicantId, List<ResolvedStep> steps, String summary) {
        BpmnDefinitions.Definition definition = BpmnDefinitions.build(bizType, steps);
        ensureDeployed(definition);
        Map<String, Object> variables = new HashMap<>();
        variables.put("bizType", bizType.name());
        variables.put("bizId", bizId);
        variables.put("applicantId", applicantId);
        variables.put("summary", summary);
        variables.put("outcome", "approved");
        for (int i = 0; i < steps.size(); i++) {
            List<String> assignees = steps.get(i).assigneeIds().stream().map(String::valueOf).toList();
            variables.put("step" + i + "Assignees", assignees);
        }
        ProcessInstance started = runtimeService.startProcessInstanceByKey(
                definition.key(),
                bizType.name() + ":" + bizId,
                variables
        );
        return started.getId();
    }

    public int currentStep(String processId) {
        try {
            return runtimeService.getActiveActivityIds(processId).stream()
                    .filter(id -> id.startsWith("step"))
                    .map(id -> Integer.parseInt(id.substring(4)))
                    .findFirst()
                    .orElse(0);
        } catch (FlowableObjectNotFoundException exception) {
            return 0;
        }
    }

    public void refresh(com.oa.process.ProcessInstance instance) {
        HistoricProcessInstance historic = historyService.createHistoricProcessInstanceQuery()
                .processInstanceId(instance.getFlowableProcessId())
                .singleResult();
        if (historic == null) {
            throw new ApprovalProblem("NOT_FOUND", "流程不存在");
        }
        if (historic.getEndTime() != null) {
            Object outcome = processVariable(instance.getFlowableProcessId(), "outcome");
            instance.setStatus("rejected".equals(outcome)
                    ? InstanceStatus.REJECTED
                    : InstanceStatus.APPROVED);
            instance.setFinishedAt(historic.getEndTime().toInstant());
            return;
        }
        instance.setStatus(InstanceStatus.RUNNING);
        instance.setCurrentStepIndex(currentStep(instance.getFlowableProcessId()));
        instance.setFinishedAt(null);
    }

    public void complete(String flowableTaskId, long actorId, String comment, boolean approve) {
        Task task = requireAssigned(flowableTaskId, actorId);
        if (comment != null && !comment.isBlank()) {
            taskService.addComment(task.getId(), task.getProcessInstanceId(), comment.trim());
        }
        taskService.complete(task.getId(), Map.of("outcome", approve ? "approved" : "rejected"));
    }

    public String transfer(String flowableTaskId, long actorId, long targetUserId, long applicantId, String comment) {
        Task task = requireAssigned(flowableTaskId, actorId);
        if (targetUserId == actorId) {
            throw new ApprovalProblem("INVALID_TRANSFER", "不能转给自己");
        }
        if (targetUserId == applicantId) {
            throw new ApprovalProblem("INVALID_TRANSFER", "不能转给申请人");
        }
        long already = taskService.createTaskQuery()
                .processInstanceId(task.getProcessInstanceId())
                .taskDefinitionKey(task.getTaskDefinitionKey())
                .taskAssignee(String.valueOf(targetUserId))
                .count();
        if (already > 0) {
            throw new ApprovalProblem("INVALID_TRANSFER", "对方已经是当前审批人");
        }
        taskService.setAssignee(task.getId(), String.valueOf(targetUserId));
        if (comment != null && !comment.isBlank()) {
            taskService.addComment(task.getId(), task.getProcessInstanceId(), comment.trim());
        }
        return task.getProcessInstanceId();
    }

    public void withdraw(String processId) {
        boolean someoneApproved = historyService.createHistoricTaskInstanceQuery()
                .processInstanceId(processId)
                .finished()
                .list()
                .stream()
                .anyMatch(task -> task.getDeleteReason() == null && "approved".equals(stepOutcome(task.getId())));
        if (someoneApproved) {
            throw new ApprovalProblem("CANNOT_CANCEL", "已经有人通过，不能撤回");
        }
        try {
            runtimeService.deleteProcessInstance(processId, "withdraw");
        } catch (FlowableObjectNotFoundException exception) {
            throw new ApprovalProblem("INVALID_STATE", "流程已经结束");
        }
    }

    public List<Task> assignedTo(long actorId) {
        return taskService.createTaskQuery()
                .taskAssignee(String.valueOf(actorId))
                .orderByTaskCreateTime()
                .desc()
                .list();
    }

    public List<Task> openTasks(String processId, int stepIndex) {
        return taskService.createTaskQuery()
                .processInstanceId(processId)
                .taskDefinitionKey("step" + stepIndex)
                .list();
    }

    public String summary(String processId) {
        Object value = processVariable(processId, "summary");
        return value == null ? "" : value.toString();
    }

    public ProcessViews.ProcessChain chain(com.oa.process.ProcessInstance instance, long actorId) {
        String processId = instance.getFlowableProcessId();
        List<ResolvedStep> steps = SnapshotCodec.read(instance.getStepsSnapshot());
        List<String> current = currentActivities(processId);
        List<HistoricTaskInstance> historicTasks = historyService.createHistoricTaskInstanceQuery()
                .processInstanceId(processId)
                .orderByHistoricTaskInstanceStartTime()
                .asc()
                .list();
        Map<Long, String> names = new HashMap<>();
        List<ProcessViews.ChainNode> nodes = new ArrayList<>();
        for (int i = 0; i < steps.size(); i++) {
            ResolvedStep step = steps.get(i);
            String activityId = "step" + i;
            List<HistoricTaskInstance> stepTasks = historicTasks.stream()
                    .filter(task -> activityId.equals(task.getTaskDefinitionKey()))
                    .toList();
            ProcessViews.ChainState state = stateOf(activityId, current, stepTasks);
            List<ProcessViews.ChainPerson> people = new ArrayList<>();
            if (stepTasks.isEmpty()) {
                for (Long assigneeId : step.assigneeIds()) {
                    people.add(new ProcessViews.ChainPerson(null, assigneeId, name(names, assigneeId), null, null));
                }
            } else {
                for (HistoricTaskInstance task : stepTasks) {
                    long assigneeId = Long.parseLong(task.getAssignee());
                    people.add(new ProcessViews.ChainPerson(
                            task.getEndTime() == null ? TASK_PREFIX + task.getId() : null,
                            assigneeId,
                            name(names, assigneeId),
                            statusOf(task),
                            comments(task.getId())
                    ));
                }
            }
            nodes.add(new ProcessViews.ChainNode(step.code(), step.code().label(), state, people));
        }
        return new ProcessViews.ProcessChain(instance.getId(), instance.getStatus(), nodes);
    }

    public ProcessViews.DiagramView diagram(com.oa.process.ProcessInstance instance) {
        String processId = instance.getFlowableProcessId();
        HistoricProcessInstance historic = historyService.createHistoricProcessInstanceQuery()
                .processInstanceId(processId)
                .singleResult();
        if (historic == null) {
            throw new ApprovalProblem("NOT_FOUND", "流程不存在");
        }
        String xml = modelXml(historic.getProcessDefinitionId());
        List<String> completed = historyService.createHistoricActivityInstanceQuery()
                .processInstanceId(processId)
                .finished()
                .list()
                .stream()
                .map(activity -> activity.getActivityId())
                .filter(id -> !id.startsWith("flow_"))
                .distinct()
                .toList();
        return new ProcessViews.DiagramView(xml, completed, currentActivities(processId));
    }

    public StepCode stepCode(com.oa.process.ProcessInstance instance, String taskDefinitionKey) {
        int index = Integer.parseInt(taskDefinitionKey.substring(4));
        List<ResolvedStep> steps = SnapshotCodec.read(instance.getStepsSnapshot());
        return steps.get(index).code();
    }

    private void ensureDeployed(BpmnDefinitions.Definition definition) {
        if (deployed.containsKey(definition.key())) {
            return;
        }
        synchronized (definition.key().intern()) {
            long count = repositoryService.createProcessDefinitionQuery()
                    .processDefinitionKey(definition.key())
                    .count();
            if (count == 0) {
                repositoryService.createDeployment()
                        .name(definition.key())
                        .addString(definition.key() + ".bpmn20.xml", definition.xml())
                        .deploy();
            }
            deployed.put(definition.key(), Boolean.TRUE);
        }
    }

    private Task requireAssigned(String flowableTaskId, long actorId) {
        Task task = taskService.createTaskQuery().taskId(flowableTaskId).singleResult();
        if (task == null) {
            throw new ApprovalProblem("TASK_CLOSED", "这份待办已经处理过");
        }
        if (!String.valueOf(actorId).equals(task.getAssignee())) {
            throw new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人");
        }
        return task;
    }

    private List<String> currentActivities(String processId) {
        try {
            return runtimeService.getActiveActivityIds(processId);
        } catch (FlowableObjectNotFoundException exception) {
            return List.of();
        }
    }

    private Object processVariable(String processId, String name) {
        List<HistoricVariableInstance> variables = historyService.createHistoricVariableInstanceQuery()
                .processInstanceId(processId)
                .variableName(name)
                .list();
        return variables.stream()
                .filter(variable -> variable.getTaskId() == null)
                .max(Comparator.comparing(
                        HistoricVariableInstance::getLastUpdatedTime,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .map(HistoricVariableInstance::getValue)
                .orElse(null);
    }

    private String stepOutcome(String taskId) {
        HistoricVariableInstance variable = historyService.createHistoricVariableInstanceQuery()
                .taskId(taskId)
                .variableName("stepOutcome")
                .singleResult();
        return variable == null || variable.getValue() == null ? null : variable.getValue().toString();
    }

    private TaskStatus statusOf(HistoricTaskInstance task) {
        if (task.getEndTime() == null) {
            return TaskStatus.PENDING;
        }
        if (task.getDeleteReason() != null) {
            return TaskStatus.CANCELLED;
        }
        return "rejected".equals(stepOutcome(task.getId())) ? TaskStatus.REJECTED : TaskStatus.APPROVED;
    }

    private ProcessViews.ChainState stateOf(
            String activityId,
            List<String> current,
            List<HistoricTaskInstance> stepTasks
    ) {
        if (current.contains(activityId)) {
            return ProcessViews.ChainState.CURRENT;
        }
        boolean finished = stepTasks.stream().anyMatch(task -> task.getEndTime() != null);
        return finished ? ProcessViews.ChainState.DONE : ProcessViews.ChainState.UPCOMING;
    }

    private String comments(String taskId) {
        List<Comment> comments = new ArrayList<>(taskService.getTaskComments(taskId));
        comments.sort(Comparator.comparing(Comment::getTime, Comparator.nullsLast(Comparator.naturalOrder())));
        String text = comments.stream()
                .map(Comment::getFullMessage)
                .filter(message -> message != null && !message.isBlank())
                .reduce((left, right) -> left + "\n" + right)
                .orElse(null);
        return text == null || text.isBlank() ? null : text;
    }

    private String name(Map<Long, String> names, long userId) {
        return names.computeIfAbsent(userId, id -> users.findById(id).map(UserAccount::getDisplayName).orElse("用户" + id));
    }

    private String modelXml(String processDefinitionId) {
        try (InputStream input = repositoryService.getProcessModel(processDefinitionId)) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("无法读取流程图", exception);
        }
    }
}
