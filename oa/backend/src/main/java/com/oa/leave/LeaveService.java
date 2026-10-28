package com.oa.leave;

import com.oa.approval.ApprovalProblem;
import com.oa.approval.BizType;
import com.oa.auth.AppUserPrincipal;
import com.oa.common.ApiException;
import com.oa.document.DocumentStatus;
import com.oa.file.AttachmentService;
import com.oa.notice.NoticeService;
import com.oa.org.UserAccount;
import com.oa.org.UserAccountRepository;
import com.oa.process.ProcessService;
import com.oa.process.ProcessViews;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class LeaveService {

    private final LeaveRequestRepository leaves;
    private final UserAccountRepository users;
    private final ProcessService processes;
    private final AttachmentService attachments;
    private final NoticeService notices;

    public LeaveService(
            LeaveRequestRepository leaves,
            UserAccountRepository users,
            ProcessService processes,
            AttachmentService attachments,
            NoticeService notices
    ) {
        this.leaves = leaves;
        this.users = users;
        this.processes = processes;
        this.attachments = attachments;
        this.notices = notices;
    }

    @Transactional
    public LeaveResponse create(LeaveDraft draft, AppUserPrincipal actor) {
        LeaveRequest leave = new LeaveRequest();
        leave.setApplicant(requireUser(actor.id()));
        leave.setStatus(DocumentStatus.DRAFT);
        apply(leave, draft);
        return toResponse(leaves.save(leave));
    }

    @Transactional
    public LeaveResponse update(long id, LeaveDraft draft, AppUserPrincipal actor) {
        LeaveRequest leave = requireOwned(id, actor);
        if (!leave.getStatus().editable()) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能修改");
        }
        apply(leave, draft);
        return toResponse(leave);
    }

    @Transactional
    public LeaveDetail submit(long id, List<Long> ccUserIds, AppUserPrincipal actor) {
        LeaveRequest leave = requireOwned(id, actor);
        if (!leave.getStatus().editable()) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能提交");
        }
        processes.start(BizType.LEAVE, leave.getId(), actor.id(), leave.getDays(), ccUserIds);
        return detail(leave.getId(), actor);
    }

    @Transactional
    public LeaveDetail urge(long id, AppUserPrincipal actor) {
        LeaveRequest leave = requireOwned(id, actor);
        processes.urge(BizType.LEAVE, leave.getId(), actor.id());
        return detail(leave.getId(), actor);
    }

    @Transactional
    public LeaveDetail cancel(long id, AppUserPrincipal actor) {
        LeaveRequest leave = requireOwned(id, actor);
        if (leave.getStatus() != DocumentStatus.IN_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "只有审批中的单据可以撤回");
        }
        processes.cancel(BizType.LEAVE, leave.getId(), actor.id());
        return detail(leave.getId(), actor);
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> mine(long applicantId) {
        return leaves.findByApplicantIdOrderByIdDesc(applicantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public LeaveDetail detail(long id, AppUserPrincipal actor) {
        LeaveRequest leave = leaves.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "请假单不存在"));
        processes.assertCanView(
                leave.getApplicant().getId(),
                BizType.LEAVE,
                leave.getId(),
                actor.id(),
                actor.role()
        );
        processes.markCcRead(actor.id(), BizType.LEAVE, leave.getId());
        notices.markDocumentRead(actor.id(), BizType.LEAVE, leave.getId());
        return new LeaveDetail(
                toResponse(leave),
                processes.timeline(BizType.LEAVE, leave.getId()),
                attachments.list(BizType.LEAVE, leave.getId()),
                processes.ccOf(BizType.LEAVE, leave.getId()),
                processes.chains(BizType.LEAVE, leave.getId(), actor.id())
        );
    }

    private void apply(LeaveRequest leave, LeaveDraft draft) {
        if (draft.endDate().isBefore(draft.startDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "结束日期不能早于开始日期");
        }
        leave.setLeaveType(draft.leaveType());
        leave.setStartDate(draft.startDate());
        leave.setEndDate(draft.endDate());
        leave.setDays(draft.days());
        leave.setReason(draft.reason().trim());
    }

    private LeaveRequest requireOwned(long id, AppUserPrincipal actor) {
        LeaveRequest leave = leaves.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "请假单不存在"));
        if (!leave.getApplicant().getId().equals(actor.id())) {
            throw new ApprovalProblem("FORBIDDEN", "只能操作自己的请假单");
        }
        return leave;
    }

    private UserAccount requireUser(long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "用户不存在"));
    }

    private LeaveResponse toResponse(LeaveRequest leave) {
        return new LeaveResponse(
                leave.getId(),
                leave.getApplicant().getId(),
                leave.getApplicant().getDisplayName(),
                leave.getLeaveType(),
                leave.getStartDate(),
                leave.getEndDate(),
                leave.getDays(),
                leave.getReason(),
                leave.getStatus()
        );
    }

    public record LeaveDraft(
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal days,
            String reason
    ) {
    }

    public record LeaveResponse(
            long id,
            long applicantId,
            String applicantName,
            LeaveType leaveType,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal days,
            String reason,
            DocumentStatus status
    ) {
    }

    public record LeaveDetail(
            LeaveResponse leave,
            List<ProcessViews.TimelineEntry> history,
            List<AttachmentService.AttachmentView> attachments,
            List<ProcessViews.CcPerson> cc,
            List<ProcessViews.ProcessChain> chains
    ) {
    }
}
