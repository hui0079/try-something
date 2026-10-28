package com.oa.notice;

import com.oa.approval.BizType;
import com.oa.org.UserAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class NoticeService {

    private final NoticeRepository notices;
    private final UserAccountRepository users;

    public NoticeService(NoticeRepository notices, UserAccountRepository users) {
        this.notices = notices;
        this.users = users;
    }

    @Transactional
    public void notifyUser(long userId, BizType bizType, long bizId, NoticeKind kind, String title, String body) {
        Notice notice = new Notice();
        notice.setUser(users.getReferenceById(userId));
        notice.setBizType(bizType);
        notice.setBizId(bizId);
        notice.setKind(kind);
        notice.setTitle(title);
        notice.setBody(trim(body, 500));
        notice.setCreatedAt(Instant.now());
        notices.save(notice);
    }

    @Transactional(readOnly = true)
    public List<NoticeView> list(long userId) {
        return notices.findByUserIdOrderByIdDesc(userId).stream()
                .map(notice -> new NoticeView(
                        notice.getId(),
                        notice.getBizType(),
                        notice.getBizId(),
                        notice.getKind(),
                        notice.getTitle(),
                        notice.getBody(),
                        notice.getReadAt() != null,
                        notice.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(long userId) {
        return notices.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markDocumentRead(long userId, BizType bizType, long bizId) {
        Instant now = Instant.now();
        for (Notice notice : notices.findByUserIdAndBizTypeAndBizIdAndReadAtIsNull(userId, bizType, bizId)) {
            notice.setReadAt(now);
        }
    }

    private String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    public record NoticeView(
            long id,
            BizType bizType,
            long bizId,
            NoticeKind kind,
            String title,
            String body,
            boolean read,
            Instant createdAt
    ) {
    }
}
