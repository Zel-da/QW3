
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class DailyReport
    {
        [Key]
        public int ReportID { get; set; }
        public int TeamID { get; set; }
        public DateTime ReportDate { get; set; }
        public string? ManagerName { get; set; }
        public string? Remarks { get; set; }
        public Team? Team { get; set; }
        public ICollection<ReportDetail> ReportDetails { get; set; } = new List<ReportDetail>();
        public ICollection<ReportSignature> ReportSignatures { get; set; } = new List<ReportSignature>();
    }
}
