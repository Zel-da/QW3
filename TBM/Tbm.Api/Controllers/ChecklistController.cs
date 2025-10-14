
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tbm.Api.Data;
using Tbm.Api.Dtos;

namespace Tbm.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChecklistController : ControllerBase
    {
        private readonly TbmContext _context;

        public ChecklistController(TbmContext context)
        {
            _context = context;
        }

        // GET: api/Checklist/5
        [HttpGet("{teamId}")]
        public async Task<ActionResult<ChecklistTemplateDto>> GetChecklistForTeam(int teamId)
        {
            var template = await _context.ChecklistTemplates
                                         .Include(t => t.TemplateItems)
                                         .AsNoTracking()
                                         .FirstOrDefaultAsync(t => t.TeamID == teamId);

            if (template == null)
            {
                return NotFound("Checklist template for the specified team not found.");
            }

            var checklistDto = new ChecklistTemplateDto
            {
                TemplateID = template.TemplateID,
                TemplateName = template.TemplateName,
                TemplateItems = template.TemplateItems.OrderBy(i => i.DisplayOrder).Select(item => new TemplateItemDto
                {
                    ItemID = item.ItemID,
                    Category = item.Category ?? string.Empty,
                    SubCategory = item.SubCategory ?? string.Empty,
                    Description = item.Description ?? string.Empty,
                    DisplayOrder = item.DisplayOrder
                }).ToList()
            };

            return Ok(checklistDto);
        }
    }
}
