
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class ReportDetail
    {
        [Key]
        public int DetailID { get; set; }
        public int ReportID { get; set; }
        public int ItemID { get; set; }
        public string? CheckState { get; set; }
        public DailyReport? Report { get; set; }
        public TemplateItem? Item { get; set; }
    }
}
