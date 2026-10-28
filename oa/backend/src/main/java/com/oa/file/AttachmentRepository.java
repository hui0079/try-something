package com.oa.file;

import com.oa.approval.BizType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByBizTypeAndBizIdOrderByIdAsc(BizType bizType, Long bizId);
}
