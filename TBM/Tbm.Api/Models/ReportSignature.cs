
using System;
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class ReportSignature
    {
        [Key]
        public int SignatureID { get; set; }
        public int ReportID { get; set; }
        public int UserID { get; set; }
        public byte[]? SignatureImage { get; set; }
        public DateTime SignedAt { get; set; }
        public DailyReport? Report { get; set; }
        public User? User { get; set; }
    }
}
