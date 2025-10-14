using System.Collections.Generic;

namespace Tbm.Api.Dtos
{
    public class ChecklistTemplateDto
    {
        public int TemplateID { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public ICollection<TemplateItemDto> TemplateItems { get; set; } = new List<TemplateItemDto>();
    }
}
