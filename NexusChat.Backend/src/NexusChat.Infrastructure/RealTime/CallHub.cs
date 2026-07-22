using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace NexusChat.Infrastructure.RealTime
{
    public class CallHub : Hub
    {
        public async Task SendCallOffer(string targetUserId, object sdpOffer, bool isVideo)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveCallOffer", Context.UserIdentifier, sdpOffer, isVideo);
        }

        public async Task SendCallAnswer(string targetUserId, object sdpAnswer)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveCallAnswer", Context.UserIdentifier, sdpAnswer);
        }

        public async Task SendIceCandidate(string targetUserId, object candidate)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
        }

        public async Task RejectCall(string targetUserId)
        {
            await Clients.User(targetUserId).SendAsync("CallRejected", Context.UserIdentifier);
        }

        public async Task EndCall(string targetUserId)
        {
            await Clients.User(targetUserId).SendAsync("CallEnded", Context.UserIdentifier);
        }
    }
}
