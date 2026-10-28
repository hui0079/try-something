package com.oa.notice;

import com.oa.approval.BizType;
import com.oa.auth.AppUserPrincipal;
import com.oa.process.ProcessService;
import com.oa.process.ProcessViews;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NoticeController {

    private final NoticeService notices;
    private final ProcessService processes;

    public NoticeController(NoticeService notices, ProcessService processes) {
        this.notices = notices;
        this.processes = processes;
    }

    @GetMapping("/notices")
    List<NoticeService.NoticeView> list(Authentication authentication) {
        return notices.list(principal(authentication).id());
    }

    @GetMapping("/notices/unread-count")
    Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("count", notices.unreadCount(principal(authentication).id()));
    }

    @GetMapping("/cc")
    List<ProcessViews.CcInboxItem> cc(Authentication authentication) {
        return processes.listCc(principal(authentication).id());
    }

    @PostMapping("/reads")
    Map<String, Boolean> markRead(@RequestBody ReadRequest request, Authentication authentication) {
        long userId = principal(authentication).id();
        notices.markDocumentRead(userId, request.bizType(), request.bizId());
        processes.markCcRead(userId, request.bizType(), request.bizId());
        return Map.of("success", true);
    }

    private AppUserPrincipal principal(Authentication authentication) {
        return (AppUserPrincipal) authentication.getPrincipal();
    }

    public record ReadRequest(BizType bizType, long bizId) {
    }
}
