
using System.ComponentModel.DataAnnotations;

namespace Tbm.Api.Models
{
    public class Team
    {
        [Key]
        public int TeamID { get; set; }
        public string? TeamName { get; set; }
    }
}
