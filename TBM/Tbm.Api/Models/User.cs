using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [Required]
        [StringLength(100)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty; // Stores the hashed password

        [Required]
        public string Role { get; set; } = "user"; // Default role

        public string? Department { get; set; }

        public DateTime CreatedAt { get; set; }

        // TeamID can be nullable if a user is not required to be in a team
        public int? TeamID { get; set; }
        public Team? Team { get; set; }
    }
}