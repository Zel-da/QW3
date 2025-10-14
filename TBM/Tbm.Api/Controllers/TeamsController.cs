
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tbm.Api.Data;
using Tbm.Api.Models;

namespace Tbm.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TeamsController : ControllerBase
    {
        private readonly TbmContext _context;

        public TeamsController(TbmContext context)
        {
            _context = context;
        }

        // GET: api/Teams
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Team>>> GetTeams()
        {
            return await _context.Teams.ToListAsync();
        }

        // GET: api/Teams/5/users
        [HttpGet("{id}/users")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersForTeam(int id)
        {
            return await _context.Users.Where(u => u.TeamID == id).ToListAsync();
        }
    }
}
