package com.oa.process;

import com.oa.approval.ApprovalPlanner;
import com.oa.approval.ApprovalProblem;
import com.oa.approval.ApprovalRouteRepository;
import com.oa.approval.BizType;
import com.oa.approval.Person;
import com.oa.approval.ResolvedStep;
import com.oa.approval.RouteMatcher;
import com.oa.approval.RouteRule;
import com.oa.approval.StepCode;
import com.oa.document.DocumentStatus;
import com.oa.expense.ExpenseRequest;
import com.oa.expense.ExpenseRequestRepository;
import com.oa.leave.LeaveRequest;
import com.oa.leave.LeaveRequestRepository;
import com.oa.notice.NoticeKind;
import com.oa.notice.NoticeService;
import com.oa.org.Department;
import com.oa.org.Role;
import com.oa.org.UserAccount;
import com.oa.org.UserAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ProcessService {

    private final ApprovalRouteRepository routes;
    private final UserAccountRepository users;
    private final ProcessInstanceRepository instances;
    private final ApprovalTaskRepository tasks;
    private final LeaveRequestRepository leaves;
    private final ExpenseRequestRepository expenses;
    private final ProcessCcRepository copies;
    private final UrgeLogRepository urges;
    private final NoticeService notices;
    private final FlowableApprovalEngine flowable;

    public ProcessService(
            ApprovalRouteRepository routes,
            UserAccountRepository users,
            ProcessInstanceRepository instances,
            ApprovalTaskRepository tasks,
            LeaveRequestRepository leaves,
            ExpenseRequestRepository expenses,
            ProcessCcRepository copies,
            UrgeLogRepository urges,
            NoticeService notices,
            FlowableApprovalEngine flowable
    ) {
        this.routes = routes;
        this.users = users;
        this.instances = instances;
        this.tasks = tasks;
        this.leaves = leaves;
        this.expenses = expenses;
        this.copies = copies;
        this.urges = urges;
        this.notices = notices;
        this.flowable = flowable;
    }

    @Transactional
    public ProcessInstance start(BizType bizType, long bizId, long applicantId, BigDecimal value, List<Long> ccUserIds) {
        List<RouteRule> rules = routes.findAll().stream().map(route -> route.toRule()).toList();
        RouteRule rule = RouteMatcher.match(rules, bizType, value);
        UserAccount applicant = users.findById(applicantId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "申请人不存在"));
        List<Person> people = users.findAllByOrderByIdAsc().stream().map(this::toPerson).toList();
        List<ResolvedStep> steps = ApprovalPlanner.plan(rule.steps(), toPerson(applicant), people);

        ProcessInstance instance = new ProcessInstance();
        instance.setBizType(bizType);
        instance.setBizId(bizId);
        instance.setApplicant(applicant);
        instance.setStepsSnapshot(SnapshotCodec.write(steps));
        instance.setStartedAt(Instant.now());
        if (steps.isEmpty()) {
            instance.setStatus(InstanceStatus.APPROVED);
            instance.setCurrentStepIndex(0);
            instance.setFinishedAt(Instant.now());
        } else {
            String flowableId = flowable.start(bizType, bizId, applicantId, steps, summary(instance));
            instance.setFlowableProcessId(flowableId);
            instance.setStatus(InstanceStatus.RUNNING);
            instance.setCurrentStepIndex(flowable.currentStep(flowableId));
        }
        instances.save(instance);
        copyTo(instance, applicantId, ccUserIds);
        syncDocument(instance);
        return instance;
    }

    @Transactional
    public void approveFlowable(String flowableTaskId, long actorId, String comment) {
        actFlowable(flowableTaskId, actorId, comment, true);
    }

    @Transactional
    public void rejectFlowable(String flowableTaskId, long actorId, String comment) {
        actFlowable(flowableTaskId, actorId, comment, false);
    }

    @Transactional
    public void transferFlowable(String flowableTaskId, long actorId, long targetUserId, String comment) {
        if (!users.existsById(targetUserId)) {
            throw new ApprovalProblem("NOT_FOUND", "转交对象不存在");
        }
        org.flowable.task.api.Task task = flowable.assignedTo(actorId).stream()
                .filter(item -> item.getId().equals(flowableTaskId))
                .findFirst()
                .orElseThrow(() -> new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人"));
        ProcessInstance instance = instances.findByFlowableProcessId(task.getProcessInstanceId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        flowable.transfer(flowableTaskId, actorId, targetUserId, instance.getApplicant().getId(), normalize(comment));
        notices.notifyUser(
                targetUserId,
                instance.getBizType(),
                instance.getBizId(),
                NoticeKind.TASK,
                "新的待办",
                flowable.summary(instance.getFlowableProcessId())
        );
    }

    @Transactional
    public void transfer(long taskId, long actorId, long targetUserId, String comment) {
        if (!users.existsById(targetUserId)) {
            throw new ApprovalProblem("NOT_FOUND", "转交对象不存在");
        }
        ApprovalTask task = tasks.findById(taskId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "待办不存在"));
        if (!task.getAssignee().getId().equals(actorId)) {
            throw new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人");
        }
        ProcessInstance instance = instances.findLockedById(task.getInstance().getId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (task.getStatus() != TaskStatus.PENDING || task.getStepIndex() != instance.getCurrentStepIndex()) {
            throw new ApprovalProblem("TASK_CLOSED", "这份待办已经处理过");
        }
        FlowState next = FlowEngine.transfer(
                load(instance),
                actorId,
                targetUserId,
                instance.getApplicant().getId(),
                normalize(comment)
        );
        apply(instance, next);
    }

    @Transactional
    public void urge(BizType bizType, long bizId, long actorId) {
        ProcessInstance instance = instances.findFirstByBizTypeAndBizIdOrderByIdDesc(bizType, bizId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (!instance.getApplicant().getId().equals(actorId)) {
            throw new ApprovalProblem("FORBIDDEN", "只有申请人可以催办");
        }
        if (instance.getStatus() != InstanceStatus.RUNNING) {
            throw new ApprovalProblem("INVALID_STATE", "只有审批中的单据可以催办");
        }
        Instant lastUrge = urges.findFirstByInstanceIdAndStepIndexOrderByCreatedAtDesc(
                instance.getId(),
                instance.getCurrentStepIndex()
        ).map(UrgeLog::getCreatedAt).orElse(null);
        Instant now = Instant.now();
        if (!UrgePolicy.allowed(lastUrge, now)) {
            throw new ApprovalProblem("URGE_TOO_SOON", "4 小时内已经催办过");
        }
        UrgeLog log = new UrgeLog();
        log.setInstance(instance);
        log.setStepIndex(instance.getCurrentStepIndex());
        log.setCreatedAt(now);
        urges.save(log);
        String body = "申请人催办：" + summary(instance);
        if (instance.getFlowableProcessId() != null) {
            for (org.flowable.task.api.Task task : flowable.openTasks(
                    instance.getFlowableProcessId(),
                    instance.getCurrentStepIndex()
            )) {
                if (task.getAssignee() != null) {
                    notices.notifyUser(Long.parseLong(task.getAssignee()), bizType, bizId, NoticeKind.URGE, "催办", body);
                }
            }
            return;
        }
        for (ApprovalTask task : tasks.findByInstanceIdOrderByIdAsc(instance.getId())) {
            if (task.getStatus() == TaskStatus.PENDING && task.getStepIndex() == instance.getCurrentStepIndex()) {
                notices.notifyUser(task.getAssignee().getId(), bizType, bizId, NoticeKind.URGE, "催办", body);
            }
        }
    }

    @Transactional
    public void approve(long taskId, long actorId, String comment) {
        act(taskId, actorId, comment, true);
    }

    @Transactional
    public void reject(long taskId, long actorId, String comment) {
        act(taskId, actorId, comment, false);
    }

    @Transactional
    public void cancel(BizType bizType, long bizId, long actorId) {
        ProcessInstance latest = instances.findFirstByBizTypeAndBizIdOrderByIdDesc(bizType, bizId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (!latest.getApplicant().getId().equals(actorId)) {
            throw new ApprovalProblem("FORBIDDEN", "只有申请人可以撤回");
        }
        ProcessInstance instance = instances.findLockedById(latest.getId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (instance.getFlowableProcessId() != null) {
            flowable.withdraw(instance.getFlowableProcessId());
            instance.setStatus(InstanceStatus.CANCELLED);
            instance.setFinishedAt(Instant.now());
            syncDocument(instance);
            return;
        }
        FlowState next = FlowEngine.cancel(load(instance));
        apply(instance, next);
        syncDocument(instance);
    }

    @Transactional(readOnly = true)
    public List<ProcessViews.TodoItem> listTodos(long actorId) {
        List<ApprovalTask> pending = tasks.findByAssigneeIdAndStatusOrderByIdDesc(actorId, TaskStatus.PENDING);
        List<ProcessViews.TodoItem> items = new ArrayList<>();
        for (ApprovalTask task : pending) {
            ProcessInstance instance = task.getInstance();
            if (instance.getStatus() != InstanceStatus.RUNNING
                    || task.getStepIndex() != instance.getCurrentStepIndex()) {
                continue;
            }
            items.add(toTodo(task, instance));
        }
        for (org.flowable.task.api.Task task : flowable.assignedTo(actorId)) {
            instances.findByFlowableProcessId(task.getProcessInstanceId())
                    .filter(instance -> instance.getStatus() == InstanceStatus.RUNNING)
                    .ifPresent(instance -> items.add(toFlowableTodo(task, instance)));
        }
        return items;
    }

    @Transactional(readOnly = true)
    public List<ProcessViews.TimelineEntry> timeline(BizType bizType, long bizId) {
        List<ProcessViews.TimelineEntry> history = new ArrayList<>();
        for (ProcessInstance instance : instances.findByBizTypeAndBizIdOrderByIdAsc(bizType, bizId)) {
            if (instance.getFlowableProcessId() != null) {
                continue;
            }
            List<ProcessViews.TaskView> views = tasks.findByInstanceIdOrderByIdAsc(instance.getId()).stream()
                    .map(this::toTaskView)
                    .toList();
            history.add(new ProcessViews.TimelineEntry(instance.getId(), instance.getStatus(), views));
        }
        return history;
    }

    @Transactional(readOnly = true)
    public void assertCanView(long applicantId, BizType bizType, long bizId, long actorId, Role role) {
        if (role == Role.ADMIN || applicantId == actorId) {
            return;
        }
        if (copies.countVisible(actorId, bizType, bizId) > 0) {
            return;
        }
        for (ProcessInstance instance : instances.findByBizTypeAndBizIdOrderByIdAsc(bizType, bizId)) {
            for (ApprovalTask task : tasks.findByInstanceIdOrderByIdAsc(instance.getId())) {
                if (task.getAssignee().getId().equals(actorId)) {
                    return;
                }
            }
        }
        throw new ApprovalProblem("FORBIDDEN", "无权查看这张单据");
    }

    @Transactional(readOnly = true)
    public List<ProcessViews.CcPerson> ccOf(BizType bizType, long bizId) {
        List<ProcessInstance> history = instances.findByBizTypeAndBizIdOrderByIdAsc(bizType, bizId);
        if (history.isEmpty()) {
            return List.of();
        }
        ProcessInstance latest = history.get(history.size() - 1);
        return copies.findByInstanceIdOrderByIdAsc(latest.getId()).stream()
                .map(copy -> new ProcessViews.CcPerson(
                        copy.getUser().getId(),
                        copy.getUser().getDisplayName(),
                        copy.getReadAt() != null
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProcessViews.CcInboxItem> listCc(long userId) {
        List<ProcessViews.CcInboxItem> items = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (ProcessCc copy : copies.findByUserIdOrderByIdDesc(userId)) {
            ProcessInstance instance = copy.getInstance();
            String key = instance.getBizType() + ":" + instance.getBizId();
            if (!seen.add(key)) {
                continue;
            }
            items.add(new ProcessViews.CcInboxItem(
                    instance.getBizType(),
                    instance.getBizId(),
                    headline(instance),
                    summary(instance),
                    copy.getReadAt() != null
            ));
        }
        return items;
    }

    @Transactional
    public void markCcRead(long userId, BizType bizType, long bizId) {
        Instant now = Instant.now();
        for (ProcessCc copy : copies.findUnread(userId, bizType, bizId)) {
            copy.setReadAt(now);
        }
    }

    @Transactional(readOnly = true)
    public List<ProcessViews.ProcessChain> chains(BizType bizType, long bizId, long actorId) {
        List<ProcessViews.ProcessChain> chains = new ArrayList<>();
        for (ProcessInstance instance : instances.findByBizTypeAndBizIdOrderByIdAsc(bizType, bizId)) {
            if (instance.getFlowableProcessId() != null) {
                chains.add(flowable.chain(instance, actorId));
            }
        }
        return chains;
    }

    @Transactional(readOnly = true)
    public ProcessViews.DiagramView diagram(long instanceId, long actorId, Role role) {
        ProcessInstance instance = instances.findById(instanceId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (instance.getFlowableProcessId() == null) {
            throw new ApprovalProblem("NOT_FOUND", "这张单据没有流程图");
        }
        assertCanView(instance.getApplicant().getId(), instance.getBizType(), instance.getBizId(), actorId, role);
        return flowable.diagram(instance);
    }

    private void actFlowable(String flowableTaskId, long actorId, String comment, boolean approve) {
        org.flowable.task.api.Task task = flowable.assignedTo(actorId).stream()
                .filter(item -> item.getId().equals(flowableTaskId))
                .findFirst()
                .orElseThrow(() -> new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人"));
        ProcessInstance instance = instances.findByFlowableProcessId(task.getProcessInstanceId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        instances.findLockedById(instance.getId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        flowable.complete(flowableTaskId, actorId, normalize(comment), approve);
        flowable.refresh(instance);
        syncDocument(instance);
    }

    private void act(long taskId, long actorId, String comment, boolean approve) {
        ApprovalTask task = tasks.findById(taskId)
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "待办不存在"));
        if (!task.getAssignee().getId().equals(actorId)) {
            throw new ApprovalProblem("NOT_ASSIGNEE", "你不是当前审批人");
        }
        ProcessInstance instance = instances.findLockedById(task.getInstance().getId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "流程不存在"));
        if (task.getStatus() != TaskStatus.PENDING || task.getStepIndex() != instance.getCurrentStepIndex()) {
            throw new ApprovalProblem("TASK_CLOSED", "这份待办已经处理过");
        }
        FlowState next = approve
                ? FlowEngine.approve(load(instance), actorId, normalize(comment))
                : FlowEngine.reject(load(instance), actorId, normalize(comment));
        apply(instance, next);
        syncDocument(instance);
    }

    private FlowState load(ProcessInstance instance) {
        List<TaskState> states = tasks.findByInstanceIdOrderByIdAsc(instance.getId()).stream()
                .map(task -> new TaskState(
                        task.getId(),
                        task.getStepIndex(),
                        task.getStepCode(),
                        task.getAssignee().getId(),
                        task.getStatus(),
                        task.getComment()
                ))
                .toList();
        return new FlowState(
                instance.getStatus(),
                instance.getCurrentStepIndex(),
                SnapshotCodec.read(instance.getStepsSnapshot()),
                states
        );
    }

    private void apply(ProcessInstance instance, FlowState next) {
        Map<Long, ApprovalTask> existing = new HashMap<>();
        for (ApprovalTask task : tasks.findByInstanceIdOrderByIdAsc(instance.getId())) {
            existing.put(task.getId(), task);
        }
        for (TaskState state : next.tasks()) {
            if (state.id() == null) {
                insertTask(instance, state);
                continue;
            }
            ApprovalTask task = existing.get(state.id());
            if (task.getStatus() != state.status()) {
                task.setStatus(state.status());
                task.setComment(state.comment());
                task.setActedAt(Instant.now());
            }
        }
        instance.setStatus(next.status());
        instance.setCurrentStepIndex(next.currentStepIndex());
        if (next.status() != InstanceStatus.RUNNING && instance.getFinishedAt() == null) {
            instance.setFinishedAt(Instant.now());
        }
    }

    private void insertTasks(ProcessInstance instance, List<TaskState> states) {
        for (TaskState state : states) {
            insertTask(instance, state);
        }
    }

    private void insertTask(ProcessInstance instance, TaskState state) {
        ApprovalTask task = new ApprovalTask();
        task.setInstance(instance);
        task.setStepIndex(state.stepIndex());
        task.setStepCode(state.stepCode());
        task.setAssignee(users.getReferenceById(state.assigneeId()));
        task.setStatus(state.status());
        task.setComment(state.comment());
        if (state.status() != TaskStatus.PENDING) {
            task.setActedAt(Instant.now());
        }
        tasks.save(task);
        if (state.status() == TaskStatus.PENDING) {
            notices.notifyUser(
                    state.assigneeId(),
                    instance.getBizType(),
                    instance.getBizId(),
                    NoticeKind.TASK,
                    "新的待办",
                    summary(instance)
            );
        }
    }

    private void syncDocument(ProcessInstance instance) {
        DocumentStatus status = switch (instance.getStatus()) {
            case RUNNING -> DocumentStatus.IN_REVIEW;
            case APPROVED -> DocumentStatus.APPROVED;
            case REJECTED -> DocumentStatus.REJECTED;
            case CANCELLED -> DocumentStatus.CANCELLED;
        };
        if (instance.getBizType() == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "请假单不存在"));
            leave.setStatus(status);
            leave.setCurrentInstance(instance);
        } else {
            ExpenseRequest expense = expenses.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "报销单不存在"));
            expense.setStatus(status);
            expense.setCurrentInstance(instance);
        }
        if (instance.getStatus() == InstanceStatus.APPROVED || instance.getStatus() == InstanceStatus.REJECTED) {
            String result = instance.getStatus() == InstanceStatus.APPROVED ? "已通过" : "已驳回";
            notices.notifyUser(
                    instance.getApplicant().getId(),
                    instance.getBizType(),
                    instance.getBizId(),
                    NoticeKind.RESULT,
                    headline(instance) + result,
                    summary(instance)
            );
        }
    }

    private ProcessViews.TodoItem toTodo(ApprovalTask task, ProcessInstance instance) {
        if (instance.getBizType() == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "请假单不存在"));
            return new ProcessViews.TodoItem(
                    String.valueOf(task.getId()),
                    BizType.LEAVE,
                    leave.getId(),
                    leave.getApplicant().getDisplayName(),
                    leave.getLeaveType().label(),
                    leave.getDays().stripTrailingZeros().toPlainString() + " 天",
                    task.getStepCode()
            );
        }
        ExpenseRequest expense = expenses.findById(instance.getBizId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "报销单不存在"));
        return new ProcessViews.TodoItem(
                String.valueOf(task.getId()),
                BizType.EXPENSE,
                expense.getId(),
                expense.getApplicant().getDisplayName(),
                "报销 · " + expense.getCategory().label(),
                expense.getAmount().stripTrailingZeros().toPlainString() + " 元",
                task.getStepCode()
        );
    }

    private ProcessViews.TodoItem toFlowableTodo(org.flowable.task.api.Task task, ProcessInstance instance) {
        StepCode stepCode = flowable.stepCode(instance, task.getTaskDefinitionKey());
        if (instance.getBizType() == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "请假单不存在"));
            return new ProcessViews.TodoItem(
                    FlowableApprovalEngine.TASK_PREFIX + task.getId(),
                    BizType.LEAVE,
                    leave.getId(),
                    leave.getApplicant().getDisplayName(),
                    leave.getLeaveType().label(),
                    leave.getDays().stripTrailingZeros().toPlainString() + " 天",
                    stepCode
            );
        }
        ExpenseRequest expense = expenses.findById(instance.getBizId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "报销单不存在"));
        return new ProcessViews.TodoItem(
                FlowableApprovalEngine.TASK_PREFIX + task.getId(),
                BizType.EXPENSE,
                expense.getId(),
                expense.getApplicant().getDisplayName(),
                "报销 · " + expense.getCategory().label(),
                expense.getAmount().stripTrailingZeros().toPlainString() + " 元",
                stepCode
        );
    }

    private ProcessViews.TaskView toTaskView(ApprovalTask task) {
        return new ProcessViews.TaskView(
                task.getId(),
                task.getStepIndex(),
                task.getStepCode(),
                task.getAssignee().getId(),
                task.getAssignee().getDisplayName(),
                task.getStatus(),
                task.getComment(),
                task.getActedAt()
        );
    }

    private Person toPerson(UserAccount user) {
        Department department = user.getDepartment();
        Long leaderId = department == null || department.getLeader() == null
                ? null
                : department.getLeader().getId();
        Long managerId = user.getManager() == null ? null : user.getManager().getId();
        return new Person(user.getId(), user.getRole(), managerId, leaderId);
    }

    private void copyTo(ProcessInstance instance, long applicantId, List<Long> ccUserIds) {
        if (ccUserIds == null || ccUserIds.isEmpty()) {
            return;
        }
        Set<Long> unique = new LinkedHashSet<>(ccUserIds);
        unique.remove(applicantId);
        for (Long userId : unique) {
            UserAccount user = users.findById(userId)
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "抄送人不存在"));
            ProcessCc copy = new ProcessCc();
            copy.setInstance(instance);
            copy.setUser(user);
            copies.save(copy);
            notices.notifyUser(userId, instance.getBizType(), instance.getBizId(), NoticeKind.CC, "抄送", summary(instance));
        }
    }

    private String headline(ProcessInstance instance) {
        if (instance.getBizType() == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "请假单不存在"));
            return leave.getApplicant().getDisplayName() + "的" + leave.getLeaveType().label();
        }
        ExpenseRequest expense = expenses.findById(instance.getBizId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "报销单不存在"));
        return expense.getApplicant().getDisplayName() + "的" + expense.getCategory().label() + "报销";
    }

    private String summary(ProcessInstance instance) {
        if (instance.getBizType() == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(instance.getBizId())
                    .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "请假单不存在"));
            return headline(instance) + "，" + leave.getDays().stripTrailingZeros().toPlainString() + " 天";
        }
        ExpenseRequest expense = expenses.findById(instance.getBizId())
                .orElseThrow(() -> new ApprovalProblem("NOT_FOUND", "报销单不存在"));
        return headline(instance) + "，" + expense.getAmount().stripTrailingZeros().toPlainString() + " 元";
    }

    private String normalize(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
