
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class ChecklistTemplate
    {
        [Key]
        public int TemplateID { get; set; }
        public string? TemplateName { get; set; }
        public int TeamID { get; set; }
        public Team? Team { get; set; }
        public ICollection<TemplateItem> TemplateItems { get; set; } = new List<TemplateItem>();
    }
}
