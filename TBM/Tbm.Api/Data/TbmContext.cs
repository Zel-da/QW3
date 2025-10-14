
using Microsoft.EntityFrameworkCore;
using Tbm.Api.Models;

namespace Tbm.Api.Data
{
    public class TbmContext : DbContext
    {
        public TbmContext(DbContextOptions<TbmContext> options) : base(options)
        {
        }

        public DbSet<Team> Teams { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<ChecklistTemplate> ChecklistTemplates { get; set; }
        public DbSet<TemplateItem> TemplateItems { get; set; }
        public DbSet<DailyReport> DailyReports { get; set; }
        public DbSet<ReportDetail> ReportDetails { get; set; }
        public DbSet<ReportSignature> ReportSignatures { get; set; }
        public DbSet<Notice> Notices { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            // Turn off cascade delete for relationships that could cause cycles
            modelBuilder.Entity<User>()
                .HasOne(u => u.Team)
                .WithMany()
                .HasForeignKey(u => u.TeamID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ReportSignature>()
                .HasOne(rs => rs.User)
                .WithMany()
                .HasForeignKey(rs => rs.UserID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ReportDetail>()
                .HasOne(rd => rd.Item)
                .WithMany()
                .HasForeignKey(rd => rd.ItemID)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
