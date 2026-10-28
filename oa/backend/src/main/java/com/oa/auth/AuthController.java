package com.oa.auth;

import com.oa.common.ApiException;
import com.oa.org.Role;
import com.oa.org.UserAccount;
import com.oa.org.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserAccountRepository users;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserAccountRepository users, AuthenticationManager authenticationManager) {
        this.users = users;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.username().trim().toLowerCase(),
                            request.password()
                    )
            );
            saveAuthentication(authentication, servletRequest);
            return UserResponse.from((AppUserPrincipal) authentication.getPrincipal(), departmentName(authentication));
        } catch (BadCredentialsException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "用户名或密码错误");
        }
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    UserResponse me(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return UserResponse.from(principal, departmentName(authentication));
    }

    @PostMapping("/logout")
    Map<String, Boolean> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("success", true);
    }

    private String departmentName(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return users.findById(principal.id())
                .map(UserAccount::getDepartment)
                .map(department -> department == null ? null : department.getName())
                .orElse(null);
    }

    private void saveAuthentication(Authentication authentication, HttpServletRequest request) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        request.getSession(true).setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                context
        );
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record UserResponse(
            long id,
            String username,
            String displayName,
            Role role,
            String departmentName
    ) {
        static UserResponse from(AppUserPrincipal principal, String departmentName) {
            return new UserResponse(
                    principal.id(),
                    principal.username(),
                    principal.displayName(),
                    principal.role(),
                    departmentName
            );
        }
    }
}
