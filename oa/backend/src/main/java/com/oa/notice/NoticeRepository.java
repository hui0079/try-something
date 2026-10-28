package com.oa.notice;

import com.oa.approval.BizType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    List<Notice> findByUserIdOrderByIdDesc(Long userId);

    long countByUserIdAndReadAtIsNull(Long userId);

    List<Notice> findByUserIdAndBizTypeAndBizIdAndReadAtIsNull(Long userId, BizType bizType, Long bizId);
}
