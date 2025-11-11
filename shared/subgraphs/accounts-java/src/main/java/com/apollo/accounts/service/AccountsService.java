package com.apollo.accounts.service;

import com.apollo.accounts.model.Product;
import com.apollo.accounts.model.User;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class AccountsService {
    private static final List<User> USERS = Arrays.asList(
        new User("1", "Alice Johnson", "alice_j", "alice@example.com"),
        new User("2", "Bob Smith", "bob_s", "bob@example.com"),
        new User("3", "Charlie Brown", "charlie_b", "charlie@example.com"),
        new User("4", "Diana Prince", "diana_p", "diana@example.com"),
        new User("5", "Eve Wilson", "eve_w", "eve@example.com")
    );

    private static final List<String> PRODUCT_IDS = Arrays.asList("1", "2", "3", "4", "5");

    public User getMe() {
        // Return the first user as "current user"
        return USERS.get(0);
    }

    public Optional<User> getUserById(String id) {
        return USERS.stream()
            .filter(u -> u.id().equals(id))
            .findFirst();
    }

    public List<User> getAllUsers() {
        return USERS;
    }

    public List<Product> getRecommendedProducts() {
        // Return a random sample of products
        Random random = new Random();
        return PRODUCT_IDS.stream()
            .limit(3)
            .map(Product::new)
            .toList();
    }

    public User resolveUserReference(String id) {
        return getUserById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }
}
