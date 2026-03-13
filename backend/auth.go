package backend

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Register creates a new user in MongoDB
func (a *App) Register(username string, password string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("users")

	// 1. Check if user already exists
	ctx, cancel := context.WithTimeout(context.Background(), 5*1e9) // 5 seconds
	defer cancel()

	var existingUser User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&existingUser)
	if err == nil {
		return ErrorResult("USERNAME_EXISTS", "Username already exists")
	}

	// 2. Hash the password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return ErrorResult("PASSWORD_HASH_FAILED", "Could not hash password")
	}

	// 3. Create the user object
	newUser := User{
		Username:     username,
		PasswordHash: string(hashedBytes),
	}

	// 4. Insert into DB
	_, err = collection.InsertOne(ctx, newUser)
	if err != nil {
		return ErrorResult("DB_INSERT_FAILED", fmt.Sprintf("Database insert failed: %v", err))
	}

	return SuccessResult("User registered")
}

// Login verifies credentials
func (a *App) Login(username string, password string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("users")

	ctx, cancel := context.WithTimeout(context.Background(), 5*1e9)
	defer cancel()

	// 1. Find the user
	var user User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return ErrorResult("USER_NOT_FOUND", "User not found")
	} else if err != nil {
		return ErrorResult("DB_ERROR", "Database error")
	}

	// 2. Compare the password with the hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return ErrorResult("INVALID_PASSWORD", "Invalid password")
	}

	return SuccessResultWithData("Logged in", map[string]string{"username": user.Username})
}
