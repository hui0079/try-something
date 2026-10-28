package com.oa.expense;

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
import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRequestRepository expenses;
    private final UserAccountRepository users;
    private final ProcessService processes;
    private final AttachmentService attachments;
    private final NoticeService notices;

    public ExpenseService(
            ExpenseRequestRepository expenses,
            UserAccountRepository users,
            ProcessService processes,
            AttachmentService attachments,
            NoticeService notices
    ) {
        this.expenses = expenses;
        this.users = users;
        this.processes = processes;
        this.attachments = attachments;
        this.notices = notices;
    }

    @Transactional
    public ExpenseResponse create(ExpenseDraft draft, AppUserPrincipal actor) {
        ExpenseRequest expense = new ExpenseRequest();
        expense.setApplicant(requireUser(actor.id()));
        expense.setStatus(DocumentStatus.DRAFT);
        apply(expense, draft);
        return toResponse(expenses.save(expense));
    }

    @Transactional
    public ExpenseResponse update(long id, ExpenseDraft draft, AppUserPrincipal actor) {
        ExpenseRequest expense = requireOwned(id, actor);
        if (!expense.getStatus().editable()) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能修改");
        }
        apply(expense, draft);
        return toResponse(expense);
    }

    @Transactional
    public ExpenseDetail submit(long id, List<Long> ccUserIds, AppUserPrincipal actor) {
        ExpenseRequest expense = requireOwned(id, actor);
        if (!expense.getStatus().editable()) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能提交");
        }
        processes.start(BizType.EXPENSE, expense.getId(), actor.id(), expense.getAmount(), ccUserIds);
        return detail(expense.getId(), actor);
    }

    @Transactional
    public ExpenseDetail urge(long id, AppUserPrincipal actor) {
        ExpenseRequest expense = requireOwned(id, actor);
        processes.urge(BizType.EXPENSE, expense.getId(), actor.id());
        return detail(expense.getId(), actor);
    }

    @Transactional
    public ExpenseDetail cancel(long id, AppUserPrincipal actor) {
        ExpenseRequest expense = requireOwned(id, actor);
        if (expense.getStatus() != DocumentStatus.IN_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "只有审批中的单据可以撤回");
        }
        processes.cancel(BizType.EXPENSE, expense.getId(), actor.id());
        return detail(expense.getId(), actor);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> mine(long applicantId) {
        return expenses.findByApplicantIdOrderByIdDesc(applicantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ExpenseDetail detail(long id, AppUserPrincipal actor) {
        ExpenseRequest expense = expenses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "报销单不存在"));
        processes.assertCanView(
                expense.getApplicant().getId(),
                BizType.EXPENSE,
                expense.getId(),
                actor.id(),
                actor.role()
        );
        processes.markCcRead(actor.id(), BizType.EXPENSE, expense.getId());
        notices.markDocumentRead(actor.id(), BizType.EXPENSE, expense.getId());
        return new ExpenseDetail(
                toResponse(expense),
                processes.timeline(BizType.EXPENSE, expense.getId()),
                attachments.list(BizType.EXPENSE, expense.getId()),
                processes.ccOf(BizType.EXPENSE, expense.getId()),
                processes.chains(BizType.EXPENSE, expense.getId(), actor.id())
        );
    }

    private void apply(ExpenseRequest expense, ExpenseDraft draft) {
        expense.setCategory(draft.category());
        expense.setAmount(draft.amount());
        expense.setReason(draft.reason().trim());
    }

    private ExpenseRequest requireOwned(long id, AppUserPrincipal actor) {
        ExpenseRequest expense = expenses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "报销单不存在"));
        if (!expense.getApplicant().getId().equals(actor.id())) {
            throw new ApprovalProblem("FORBIDDEN", "只能操作自己的报销单");
        }
        return expense;
    }

    private UserAccount requireUser(long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "用户不存在"));
    }

    private ExpenseResponse toResponse(ExpenseRequest expense) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getApplicant().getId(),
                expense.getApplicant().getDisplayName(),
                expense.getCategory(),
                expense.getAmount(),
                expense.getReason(),
                expense.getStatus()
        );
    }

    public record ExpenseDraft(ExpenseCategory category, BigDecimal amount, String reason) {
    }

    public record ExpenseResponse(
            long id,
            long applicantId,
            String applicantName,
            ExpenseCategory category,
            BigDecimal amount,
            String reason,
            DocumentStatus status
    ) {
    }

    public record ExpenseDetail(
            ExpenseResponse expense,
            List<ProcessViews.TimelineEntry> history,
            List<AttachmentService.AttachmentView> attachments,
            List<ProcessViews.CcPerson> cc,
            List<ProcessViews.ProcessChain> chains
    ) {
    }
}
