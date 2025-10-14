
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class TemplateItem
    {
        [Key]
        public int ItemID { get; set; }
        public int TemplateID { get; set; }
        public string? Category { get; set; }
        public string? SubCategory { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public ChecklistTemplate? Template { get; set; }
    }
}
