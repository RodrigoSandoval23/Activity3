/**
 * User Entity / DTO (Data Transfer Object)
 *
 * Represents the structure of a user account during registration or session handling.
 * This class is primarily used for transporting form data to the authentication service.
 */
export class User {
  /**
   * Creates a new User instance.
   *
   * @param {string} name - First name.
   * @param {string} lastName - Last name / Surname.
   * @param {string} email - Unique identifier used for login.
   * @param {string} password - The raw password string.

   */
  constructor(name, lastName, email, password) {
    this.name = name;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
  }
}
