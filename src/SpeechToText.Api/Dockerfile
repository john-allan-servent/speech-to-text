FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/SpeechToText.Core/*.csproj SpeechToText.Core/
COPY src/SpeechToText.Api/*.csproj SpeechToText.Api/
RUN dotnet restore SpeechToText.Api/SpeechToText.Api.csproj
COPY src/SpeechToText.Core/ SpeechToText.Core/
COPY src/SpeechToText.Api/ SpeechToText.Api/
RUN dotnet publish SpeechToText.Api/SpeechToText.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
# Native dependencies required by the Speech SDK on Linux
RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 libasound2t64 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "SpeechToText.Api.dll"]
