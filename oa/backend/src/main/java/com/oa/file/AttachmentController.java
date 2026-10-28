package com.oa.file;

import com.oa.auth.AppUserPrincipal;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentService attachments;

    public AttachmentController(AttachmentService attachments) {
        this.attachments = attachments;
    }

    @GetMapping("/{id}")
    ResponseEntity<org.springframework.core.io.Resource> download(@PathVariable long id, Authentication authentication) {
        AttachmentService.Download download = attachments.open(id, principal(authentication));
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(download.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(download.contentType()))
                .body(download.resource());
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id, Authentication authentication) {
        attachments.delete(id, principal(authentication));
        return ResponseEntity.noContent().build();
    }

    private AppUserPrincipal principal(Authentication authentication) {
        return (AppUserPrincipal) authentication.getPrincipal();
    }
}
