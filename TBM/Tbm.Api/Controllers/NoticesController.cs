using Microsoft.AspNetCore.Mvc;
using Tbm.Api.Data;
using Tbm.Api.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;

namespace Tbm.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NoticesController : ControllerBase
    {
        private readonly TbmContext _context;

        public NoticesController(TbmContext context)
        {
            _context = context;
        }

        // GET: api/Notices
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Notice>>> GetNotices()
        {
            return await _context.Notices.OrderByDescending(n => n.CreatedAt).ToListAsync();
        }

        // GET: api/Notices/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Notice>> GetNotice(string id)
        {
            var notice = await _context.Notices.FindAsync(id);

            if (notice == null)
            {
                return NotFound();
            }

            // Increment view count
            notice.ViewCount++;
            await _context.SaveChangesAsync();

            return notice;
        }

        // POST: api/Notices
        [HttpPost]
        [Authorize(Roles = "admin")] // Only admins can create notices
        public async Task<ActionResult<Notice>> PostNotice(Notice notice)
        {
            // Ensure AuthorId is set from authenticated user if needed, or from the model
            // For now, we'll assume AuthorId comes from the model and is valid
            _context.Notices.Add(notice);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNotice), new { id = notice.Id }, notice);
        }

        // PUT: api/Notices/5
        [HttpPut("{id}")]
        [Authorize(Roles = "admin")] // Only admins can update notices
        public async Task<IActionResult> PutNotice(string id, Notice notice)
        {
            if (id != notice.Id)
            {
                return BadRequest();
            }

            _context.Entry(notice).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!NoticeExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/Notices/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")] // Only admins can delete notices
        public async Task<IActionResult> DeleteNotice(string id)
        {
            var notice = await _context.Notices.FindAsync(id);
            if (notice == null)
            {
                return NotFound();
            }

            _context.Notices.Remove(notice);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool NoticeExists(string id)
        {
            return _context.Notices.Any(e => e.Id == id);
        }
    }
}
