using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tbm.Api.Data;
using Tbm.Api.Models;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly TbmContext _context;

        public AuthController(TbmContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register([FromBody] RegisterDto model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return Conflict("User with this email already exists.");
            }

            // Hash password (using a simple hash for now, replace with a proper library like BCrypt in production)
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(model.Password);

            var user = new User
            {
                UserName = model.Username,
                Email = model.Email,
                Password = hashedPassword,
                Department = model.Department,
                Role = model.Role ?? "user", // Default to 'user' if not provided
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Automatically log in the user after registration
            await AuthenticateUser(user);

            return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, new UserDto(user));
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login([FromBody] LoginDto model)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == model.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
            {
                return Unauthorized("Invalid email or password.");
            }

            await AuthenticateUser(user);

            return new UserDto(user);
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok("Logged out successfully.");
        }

        [Authorize]
        [HttpGet("me")]
        public ActionResult<UserDto> GetUser()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Unauthorized("Not authenticated.");
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            // In a real app, you'd fetch the user from DB to get full details
            // For this example, we'll reconstruct from claims
            return new UserDto
            {
                Id = int.Parse(userIdClaim.Value),
                Username = User.FindFirst(ClaimTypes.Name)?.Value,
                Email = User.FindFirst(ClaimTypes.Email)?.Value,
                Department = User.FindFirst("Department")?.Value,
                Role = User.FindFirst(ClaimTypes.Role)?.Value
            };
        }

        private async Task AuthenticateUser(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Name, user.UserName ?? ""),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim("Department", user.Department ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "user")
            };

            var claimsIdentity = new ClaimsIdentity(
                claims, CookieAuthenticationDefaults.AuthenticationScheme);

            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true, // Keep user logged in across browser sessions
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7) // Cookie expires in 7 days
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);
        }
    }

    // DTOs for authentication
    public class RegisterDto
    {
        [Required] public string Username { get; set; } = string.Empty;
        [Required] [EmailAddress] public string Email { get; set; } = string.Empty;
        [Required] [MinLength(8)] public string Password { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? Role { get; set; }
    }

    public class LoginDto
    {
        [Required] [EmailAddress] public string Email { get; set; } = string.Empty;
        [Required] public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string? Department { get; set; }
        public string? Role { get; set; }

        public UserDto() { }

        public UserDto(User user)
        {
            Id = user.UserID;
            Username = user.UserName;
            Email = user.Email;
            Department = user.Department;
            Role = user.Role;
        }
    }
}
