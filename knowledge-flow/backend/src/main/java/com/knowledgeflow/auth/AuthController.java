package com.knowledgeflow.auth;

import com.knowledgeflow.common.ApiException;
import com.knowledgeflow.user.UserAccount;
import com.knowledgeflow.user.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthController(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/register")
    ResponseEntity<UserResponse> register(
            @Valid @RequestBody Credentials request,
            HttpServletRequest servletRequest
    ) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "该邮箱已注册");
        }

        UserAccount user = users.save(new UserAccount(
                email,
                passwordEncoder.encode(request.password())
        ));
        AppUserPrincipal principal = AppUserPrincipal.from(user);
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal,
                null,
                principal.getAuthorities()
        );
        saveAuthentication(authentication, servletRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(principal));
    }

    @PostMapping("/login")
    UserResponse login(
            @Valid @RequestBody Credentials request,
            HttpServletRequest servletRequest
    ) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.email().trim(),
                            request.password()
                    )
            );
            saveAuthentication(authentication, servletRequest);
            return UserResponse.from((AppUserPrincipal) authentication.getPrincipal());
        } catch (BadCredentialsException exception) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS",
                    "邮箱或密码错误"
            );
        }
    }

    @GetMapping("/me")
    UserResponse me(Authentication authentication) {
        return UserResponse.from((AppUserPrincipal) authentication.getPrincipal());
    }

    @PostMapping("/logout")
    Map<String, Boolean> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("success", true);
    }

    private void saveAuthentication(
            Authentication authentication,
            HttpServletRequest request
    ) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        request.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                context
        );
    }

    record Credentials(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, max = 72) String password
    ) {
    }

    record UserResponse(String id, String email) {
        static UserResponse from(AppUserPrincipal principal) {
            return new UserResponse(principal.id().toString(), principal.email());
        }
    }
}
