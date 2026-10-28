package com.knowledgeflow.auth;

import com.knowledgeflow.user.UserAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserAccountRepository users;

    public AppUserDetailsService(UserAccountRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        return users.findByEmailIgnoreCase(email.trim())
                .map(AppUserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在"));
    }
}
