package com.oa.file;

import com.oa.approval.ApprovalProblem;
import com.oa.approval.BizType;
import com.oa.auth.AppUserPrincipal;
import com.oa.common.ApiException;
import com.oa.config.AppProperties;
import com.oa.document.DocumentStatus;
import com.oa.expense.ExpenseRequest;
import com.oa.expense.ExpenseRequestRepository;
import com.oa.leave.LeaveRequest;
import com.oa.leave.LeaveRequestRepository;
import com.oa.process.ProcessService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentService {

    private static final Set<String> ALLOWED = Set.of("pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "pdf", "application/pdf",
            "png", "image/png",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls", "application/vnd.ms-excel",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final AttachmentRepository attachments;
    private final LeaveRequestRepository leaves;
    private final ExpenseRequestRepository expenses;
    private final ProcessService processes;
    private final Path storageRoot;

    public AttachmentService(
            AttachmentRepository attachments,
            LeaveRequestRepository leaves,
            ExpenseRequestRepository expenses,
            ProcessService processes,
            AppProperties properties
    ) {
        this.attachments = attachments;
        this.leaves = leaves;
        this.expenses = expenses;
        this.processes = processes;
        this.storageRoot = Path.of(properties.getStorageDir()).toAbsolutePath().normalize();
    }

    @Transactional
    public AttachmentView store(BizType bizType, long bizId, MultipartFile file, AppUserPrincipal actor) {
        DocumentRef document = requireOwnedEditable(bizType, bizId, actor);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "请选择文件");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "单个文件不能超过 10MB");
        }
        String original = fileName(file.getOriginalFilename());
        String extension = extension(original);
        if (!ALLOWED.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "只允许 pdf、图片、Word 和 Excel");
        }
        String storedName = UUID.randomUUID() + "." + extension;
        try {
            Files.createDirectories(storageRoot);
            Path target = storageRoot.resolve(storedName).normalize();
            if (!target.startsWith(storageRoot)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "文件名不合法");
            }
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target);
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORE_FAILED", "文件保存失败");
        }

        Attachment attachment = new Attachment();
        attachment.setBizType(bizType);
        attachment.setBizId(bizId);
        attachment.setOriginalName(original);
        attachment.setStoredName(storedName);
        attachment.setContentType(CONTENT_TYPES.get(extension));
        attachment.setSizeBytes(file.getSize());
        attachment.setUploader(document.owner());
        attachment.setCreatedAt(Instant.now());
        attachments.save(attachment);
        return toView(attachment);
    }

    @Transactional(readOnly = true)
    public java.util.List<AttachmentView> list(BizType bizType, long bizId) {
        return attachments.findByBizTypeAndBizIdOrderByIdAsc(bizType, bizId).stream().map(this::toView).toList();
    }

    @Transactional
    public void delete(long id, AppUserPrincipal actor) {
        Attachment attachment = require(id);
        requireOwnedEditable(attachment.getBizType(), attachment.getBizId(), actor);
        attachments.delete(attachment);
        try {
            Files.deleteIfExists(resolve(attachment.getStoredName()));
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORE_FAILED", "文件删除失败");
        }
    }

    @Transactional(readOnly = true)
    public Download open(long id, AppUserPrincipal actor) {
        Attachment attachment = require(id);
        long applicantId = applicantId(attachment.getBizType(), attachment.getBizId());
        processes.assertCanView(applicantId, attachment.getBizType(), attachment.getBizId(), actor.id(), actor.role());
        Path path = resolve(attachment.getStoredName());
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "文件不存在");
        }
        return new Download(new FileSystemResource(path), attachment.getOriginalName(), attachment.getContentType());
    }

    private DocumentRef requireOwnedEditable(BizType bizType, long bizId, AppUserPrincipal actor) {
        if (bizType == BizType.LEAVE) {
            LeaveRequest leave = leaves.findById(bizId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "请假单不存在"));
            if (!leave.getApplicant().getId().equals(actor.id())) {
                throw new ApprovalProblem("FORBIDDEN", "只能修改自己的附件");
            }
            if (!leave.getStatus().editable()) {
                throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能修改附件");
            }
            return new DocumentRef(leave.getApplicant());
        }
        ExpenseRequest expense = expenses.findById(bizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "报销单不存在"));
        if (!expense.getApplicant().getId().equals(actor.id())) {
            throw new ApprovalProblem("FORBIDDEN", "只能修改自己的附件");
        }
        if (!expense.getStatus().editable()) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "当前状态不能修改附件");
        }
        return new DocumentRef(expense.getApplicant());
    }

    private long applicantId(BizType bizType, long bizId) {
        if (bizType == BizType.LEAVE) {
            return leaves.findById(bizId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "请假单不存在"))
                    .getApplicant().getId();
        }
        return expenses.findById(bizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "报销单不存在"))
                .getApplicant().getId();
    }

    private Attachment require(long id) {
        return attachments.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "附件不存在"));
    }

    private Path resolve(String storedName) {
        Path path = storageRoot.resolve(storedName).normalize();
        if (!path.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "文件名不合法");
        }
        return path;
    }

    private String fileName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "文件名不能为空");
        }
        String name = Path.of(raw).getFileName().toString().trim();
        if (name.length() > 255) {
            name = name.substring(name.length() - 255);
        }
        return name;
    }

    private String extension(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private AttachmentView toView(Attachment attachment) {
        return new AttachmentView(attachment.getId(), attachment.getOriginalName(), attachment.getSizeBytes());
    }

    private record DocumentRef(com.oa.org.UserAccount owner) {
    }

    public record AttachmentView(long id, String name, long sizeBytes) {
    }

    public record Download(Resource resource, String fileName, String contentType) {
    }
}
