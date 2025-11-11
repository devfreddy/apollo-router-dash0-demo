package com.apollo.accounts.model;

public record User(String id, String name, String username, String email) {
    public static User fromMap(java.util.Map<String, Object> map) {
        return new User(
            (String) map.get("id"),
            (String) map.get("name"),
            (String) map.get("username"),
            (String) map.get("email")
        );
    }
}
