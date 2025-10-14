
using Microsoft.AspNetCore.Mvc;
using Tbm.Api.Data;
using Tbm.Api.Dtos;
using Tbm.Api.Models;
using System;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace Tbm.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly TbmContext _context;

        public ReportsController(TbmContext context)
        {
            _context = context;
        }

        // POST: api/Reports
        [HttpPost]
        public async Task<ActionResult<DailyReport>> PostReport(ReportSubmissionDto submissionDto)
        {
            if (submissionDto == null || submissionDto.Results == null || submissionDto.Signatures == null)
            {
                return BadRequest("Invalid submission data.");
            }

            var report = new DailyReport
            {
                TeamID = submissionDto.TeamId,
                ReportDate = submissionDto.ReportDate.ToUniversalTime(),
                ManagerName = submissionDto.ManagerName,
                Remarks = submissionDto.Remarks,
                ReportDetails = new List<ReportDetail>(),
                ReportSignatures = new List<ReportSignature>()
            };

            foreach (var result in submissionDto.Results)
            {
                report.ReportDetails.Add(new ReportDetail
                {
                    ItemID = result.Key,
                    CheckState = result.Value
                });
            }

            foreach (var signatureDto in submissionDto.Signatures)
            {
                if (!string.IsNullOrEmpty(signatureDto.SignatureImage))
                {
                    // Assuming the image is "data:image/png;base64,iVBORw0KGgo..."
                    var base64Data = signatureDto.SignatureImage.Split(',')[1];
                    report.ReportSignatures.Add(new ReportSignature
                    {
                        UserID = signatureDto.UserId,
                        SignatureImage = Convert.FromBase64String(base64Data),
                        SignedAt = DateTime.UtcNow
                    });
                }
            }

            _context.DailyReports.Add(report);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetReport), new { id = report.ReportID }, report);
        }

        // GET: api/Reports
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DailyReport>>> GetReports(
            [FromQuery] DateTime? date, 
            [FromQuery] int? teamId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var query = _context.DailyReports.AsQueryable();

            // 기간별 조회 (startDate와 endDate 우선)
            if (startDate.HasValue && endDate.HasValue)
            {
                query = query.Where(r => r.ReportDate.Date >= startDate.Value.Date && r.ReportDate.Date <= endDate.Value.Date);
            }
            // 단일 날짜 조회 (기존 기능 유지)
            else if (date.HasValue)
            {
                query = query.Where(r => r.ReportDate.Date == date.Value.Date);
            }

            if (teamId.HasValue)
            {
                query = query.Where(r => r.TeamID == teamId.Value);
            }

            return await query.Include(r => r.Team)
                              .Include(r => r.ReportDetails)
                              .Include(r => r.ReportSignatures)
                              .ThenInclude(rs => rs.User)
                              .OrderByDescending(r => r.ReportDate)
                              .ToListAsync();
        }

        // GET: api/Reports/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DailyReport>> GetReport(int id)
        {
            var report = await _context.DailyReports
                .Include(r => r.Team)
                .Include(r => r.ReportDetails)
                    .ThenInclude(rd => rd.Item)
                .Include(r => r.ReportSignatures)
                    .ThenInclude(rs => rs.User)
                .FirstOrDefaultAsync(r => r.ReportID == id);

            if (report == null)
            {
                return NotFound();
            }

            return report;
        }

        // DELETE: api/Reports/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var report = await _context.DailyReports.FindAsync(id);
            if (report == null)
            {
                return NotFound();
            }

            _context.DailyReports.Remove(report);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PUT: api/Reports/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutReport(int id, ReportSubmissionDto submissionDto)
        {
            var reportToUpdate = await _context.DailyReports
                .Include(r => r.ReportDetails)
                .Include(r => r.ReportSignatures)
                .FirstOrDefaultAsync(r => r.ReportID == id);

            if (reportToUpdate == null)
            {
                return NotFound();
            }

            // Update scalar properties
            reportToUpdate.ReportDate = submissionDto.ReportDate.ToUniversalTime();
            reportToUpdate.ManagerName = submissionDto.ManagerName;
            reportToUpdate.Remarks = submissionDto.Remarks;

            // Clear existing collections and add new ones
            reportToUpdate.ReportDetails.Clear();
            reportToUpdate.ReportSignatures.Clear();

            if(submissionDto.Results != null)
            {
                foreach (var result in submissionDto.Results)
                {
                    reportToUpdate.ReportDetails.Add(new ReportDetail
                    {
                        ItemID = result.Key,
                        CheckState = result.Value
                    });
                }
            }

            if(submissionDto.Signatures != null)
            {
                foreach (var signatureDto in submissionDto.Signatures)
                {
                    if (!string.IsNullOrEmpty(signatureDto.SignatureImage))
                    {
                        var base64Data = signatureDto.SignatureImage.Split(',')[1];
                        reportToUpdate.ReportSignatures.Add(new ReportSignature
                        {
                            UserID = signatureDto.UserId,
                            SignatureImage = Convert.FromBase64String(base64Data),
                            SignedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.DailyReports.Any(e => e.ReportID == id))
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
    }
}
