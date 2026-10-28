package com.knowledgeflow.graph;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KnowledgeGraphRepository extends JpaRepository<KnowledgeGraph, UUID> {
    List<KnowledgeGraph> findAllByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    Optional<KnowledgeGraph> findByIdAndOwnerId(UUID id, UUID ownerId);
}
