package com.oa.process;

import com.oa.approval.BizType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProcessCcRepository extends JpaRepository<ProcessCc, Long> {

    List<ProcessCc> findByUserIdOrderByIdDesc(Long userId);

    List<ProcessCc> findByInstanceIdOrderByIdAsc(Long instanceId);

    @Query("""
            select count(cc) from ProcessCc cc
            where cc.user.id = :userId
              and cc.instance.bizType = :bizType
              and cc.instance.bizId = :bizId
            """)
    long countVisible(@Param("userId") Long userId, @Param("bizType") BizType bizType, @Param("bizId") Long bizId);

    @Query("""
            select cc from ProcessCc cc
            where cc.user.id = :userId
              and cc.instance.bizType = :bizType
              and cc.instance.bizId = :bizId
              and cc.readAt is null
            """)
    List<ProcessCc> findUnread(
            @Param("userId") Long userId,
            @Param("bizType") BizType bizType,
            @Param("bizId") Long bizId
    );
}
