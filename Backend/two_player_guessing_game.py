def guessing_game():
    print("===== NUMBER GUESSING GAME =====")
    guesses = 0
    player1_name = input("1st Player Name (You): ")
    player2_name = input("2nd Player Name (Opponent): ")

    player1_secret = int(input(f"{player1_name}'s secret number: "))

    print("============ Round 1 =============")
    print(f"===== Now it's {player2_name} turn =====")

    while True:
        player2_guess = int(input("Guess the number: "))
        if player2_guess < player1_secret:
            print("Too Low! Go Higher.")
            guesses += 1
            if guesses == 1:
                print(f"{guesses} Attempt")
            else:
                print(f"{guesses} Attempts")
            
        elif player2_guess > player1_secret:
            print("Too high! Go Lower.")
            guesses += 1
            if guesses == 1:
                print(f"{guesses} Attempt")
            else:
                print(f"{guesses} Attempts")
        
        elif player2_guess == player1_secret:
            guesses += 1
            if guesses == 1:
                print(f"Congratulations! You guessed {player2_guess} correctly in {guesses} attempt!")
                guesses = 0
                break
            else:
                print(f"Congratulations! You guessed {player2_guess} correctly in {guesses} attempts!")
                guesses = 0
                break

    player2_secret = int(input(f"{player2_name}'s secret number: "))
    print("================ Round 2 ==================")
    print(f"===== Now it's {player1_name}'s turn =====")

    while True:
        player1_guess = int(input("Guess the number: "))
        if player1_guess < player2_secret:
            print("Too Low! Go Higher.")
            guesses += 1
            if guesses == 1:
                print(f"{guesses} Attempt")
            else:
                print(f"{guesses} Attempts")
        
        if player1_guess > player2_secret:
            print("Too High! Go Lower.")
            guesses += 1
            if guesses == 1:
                print(f"{guesses} Attempt")
            else:
                print(f"{guesses} Attempts")
        
        elif player1_guess == player2_secret:
            guesses += 1
            if guesses == 1:
                print(f"Congratulations! You guessed {player1_guess} correctly in {guesses} attempt!")
                guesses = 0
            else:
                print(f"Congratulations! You guessed {player1_guess} correctly in {guesses} attempts!")
                guesses = 0
                break

guessing_game()