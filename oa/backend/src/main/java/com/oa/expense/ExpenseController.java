package com.oa.expense;

import com.oa.approval.BizType;
import com.oa.auth.AppUserPrincipal;
import com.oa.file.AttachmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenses;
    private final AttachmentService attachments;

    public ExpenseController(ExpenseService expenses, AttachmentService attachments) {
        this.expenses = expenses;
        this.attachments = attachments;
    }

    @GetMapping("/mine")
    List<ExpenseService.ExpenseResponse> mine(Authentication authentication) {
        return expenses.mine(principal(authentication).id());
    }

    @GetMapping("/{id}")
    ExpenseService.ExpenseDetail detail(@PathVariable long id, Authentication authentication) {
        return expenses.detail(id, principal(authentication));
    }

    @PostMapping
    ResponseEntity<ExpenseService.ExpenseResponse> create(
            @Valid @RequestBody DraftRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenses.create(request.toDraft(), principal(authentication)));
    }

    @PutMapping("/{id}")
    ExpenseService.ExpenseResponse update(
            @PathVariable long id,
            @Valid @RequestBody DraftRequest request,
            Authentication authentication
    ) {
        return expenses.update(id, request.toDraft(), principal(authentication));
    }

    @PostMapping("/{id}/submit")
    ExpenseService.ExpenseDetail submit(
            @PathVariable long id,
            @RequestBody(required = false) SubmitRequest request,
            Authentication authentication
    ) {
        return expenses.submit(id, request == null ? List.of() : request.ccUserIds(), principal(authentication));
    }

    @PostMapping("/{id}/urge")
    ExpenseService.ExpenseDetail urge(@PathVariable long id, Authentication authentication) {
        return expenses.urge(id, principal(authentication));
    }

    @PostMapping("/{id}/attachments")
    AttachmentService.AttachmentView upload(
            @PathVariable long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return attachments.store(BizType.EXPENSE, id, file, principal(authentication));
    }

    @PostMapping("/{id}/cancel")
    ExpenseService.ExpenseDetail cancel(@PathVariable long id, Authentication authentication) {
        return expenses.cancel(id, principal(authentication));
    }

    private AppUserPrincipal principal(Authentication authentication) {
        return (AppUserPrincipal) authentication.getPrincipal();
    }

    public record DraftRequest(
            @NotNull ExpenseCategory category,
            @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
            @NotBlank @Size(max = 500) String reason
    ) {
        ExpenseService.ExpenseDraft toDraft() {
            return new ExpenseService.ExpenseDraft(category, amount, reason);
        }
    }

    public record SubmitRequest(List<Long> ccUserIds) {
    }
}
